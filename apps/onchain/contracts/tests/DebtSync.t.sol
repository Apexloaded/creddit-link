// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/*
 * DebtSync.t.sol
 *
 * Run:  forge test --match-path "*DebtSync.t.sol" -vv
 *
 * Original tests are kept, but every USDG amount is now scaled by `U`
 * (10 ** usdg.decimals()). USDG has 6 decimals, so the old `500e18` style
 * amounts were 1e12x too large (raw units) and tripped ExceedsCreditLimit.
 *
 * Diagnostics:
 *   A  live view must grow with NO write; stored index must NOT; a write must sync them
 *   B  time ladder (1s .. 365d) showing the smallest visible change in raw USDG units
 *   C  pool writing its own accrual (LP deposit) must not desync the credit line view
 *   D  borrow/repay sequence: stored index must keep advancing, never fall behind derived
 *   E  full repay after interest accrued (router tracks principal only?)
 *   F  repay principal, then try to repay the remaining interest
 */

import {console} from "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {
    CredditCreditLine,
    NotPositionOwner
} from "../core/CredditCreditLine.sol";
import {CredditInterestRateModel} from "../core/CredditInterestRateModel.sol";
import {CredditLendingRouter} from "../core/CredditLendingRouter.sol";
import {CredditLiquidityPool} from "../core/CredditLiquidityPool.sol";
import {CredditRiskEngine} from "../core/CredditRiskEngine.sol";
import {CredditAssetRegistry} from "../core/CredditAssetRegistry.sol";
import {CredditTreasury} from "../core/CredditTreasury.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockOracle} from "../mock/MockOracle.sol";

import {
    PositionUnsafeAfterWithdrawal,
    ExceedsCreditLimit,
    RouterRepayShortfall
} from "../core/CredditCreditLine.sol";
import {NothingToRepay} from "../core/CredditLendingRouter.sol";

contract DebtSyncTest is Test {
    using WadMath for uint256;

    // Core Protocol Contracts
    CredditCreditLine public creditLine;
    CredditInterestRateModel public rateModel;
    CredditLendingRouter public router;
    CredditLiquidityPool public pool;
    CredditRiskEngine public riskEngine;
    CredditAssetRegistry public registry;
    CredditTreasury public treasury;

    // Tokens & Mocks
    MockERC20 public usdg;
    MockERC20 public stockToken;
    MockOracle public oracle;

    // Test Users
    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public liquidator = address(0x111C);

    /// @dev One whole USDG in raw token units (10 ** usdg.decimals()).
    uint256 internal U;

    /// @dev Rounding-noise bound (index wei) for "derived index vs stored index".
    int256 internal constant GAP_TOL = 1e12;

    function setUp() public {
        // 1. Deploy Tokens & Oracle
        usdg = new MockERC20("USD Stablecoin", "USDG", 6, admin);
        stockToken = new MockERC20("Apple Stock Token", "aAAPL", 18, admin);
        oracle = new MockOracle();
        U = 10 ** uint256(usdg.decimals());

        oracle.setPrice(address(usdg), 1e18); // $1.00 USDG
        oracle.setPrice(address(stockToken), 150e18); // $150.00 Collateral

        // 2. Deploy Implementations
        CredditAssetRegistry registryImpl = new CredditAssetRegistry();
        CredditTreasury treasuryImpl = new CredditTreasury();
        CredditRiskEngine riskEngineImpl = new CredditRiskEngine();
        CredditInterestRateModel rateModelImpl = new CredditInterestRateModel();
        CredditLendingRouter routerImpl = new CredditLendingRouter();
        CredditLiquidityPool poolImpl = new CredditLiquidityPool();
        CredditCreditLine creditLineImpl = new CredditCreditLine();

        // 3. Deploy & Initialize Proxies
        registry = CredditAssetRegistry(
            address(
                new ERC1967Proxy(
                    address(registryImpl),
                    abi.encodeCall(CredditAssetRegistry.initialize, (admin))
                )
            )
        );

        treasury = CredditTreasury(
            payable(
                address(
                    new ERC1967Proxy(
                        address(treasuryImpl),
                        abi.encodeCall(CredditTreasury.initialize, (admin))
                    )
                )
            )
        );

        riskEngine = CredditRiskEngine(
            address(
                new ERC1967Proxy(
                    address(riskEngineImpl),
                    abi.encodeCall(
                        CredditRiskEngine.initialize,
                        (
                            admin,
                            address(registry),
                            address(oracle),
                            0.90e18, // 90% credit utilization cap
                            5, // max collateral assets
                            0.50e18 // 50% liquidation close factor
                        )
                    )
                )
            )
        );

        rateModel = CredditInterestRateModel(
            address(
                new ERC1967Proxy(
                    address(rateModelImpl),
                    abi.encodeCall(
                        CredditInterestRateModel.initialize,
                        (
                            admin,
                            CredditInterestRateModel.Params({
                                baseRateWad: 0.02e18, // 2%
                                kinkWad: 0.80e18, // 80%
                                slope1Wad: 0.10e18, // 10%
                                slope2Wad: 1.00e18 // 100%
                            })
                        )
                    )
                )
            )
        );

        router = CredditLendingRouter(
            address(
                new ERC1967Proxy(
                    address(routerImpl),
                    abi.encodeCall(
                        CredditLendingRouter.initialize,
                        (admin, address(usdg))
                    )
                )
            )
        );

        pool = CredditLiquidityPool(
            address(
                new ERC1967Proxy(
                    address(poolImpl),
                    abi.encodeCall(
                        CredditLiquidityPool.initialize,
                        (
                            address(usdg),
                            "Creddit USDG LP",
                            "cUSDG",
                            admin,
                            address(rateModel),
                            payable(address(treasury))
                        )
                    )
                )
            )
        );

        creditLine = CredditCreditLine(
            address(
                new ERC1967Proxy(
                    address(creditLineImpl),
                    abi.encodeCall(
                        CredditCreditLine.initialize,
                        (
                            admin,
                            address(registry),
                            address(usdg),
                            address(riskEngine),
                            address(oracle),
                            address(router),
                            payable(address(treasury))
                        )
                    )
                )
            )
        );

        // 4. Configure Roles and Protocol Wiring
        router.setCreditLine(address(creditLine));
        router.setAdapter(address(pool), true);
        pool.setRouter(address(router));

        registry.addAsset(
            address(stockToken),
            8000, // 80% Collateral Factor
            8500, // 85% Liquidation Threshold
            1000, // 10% Liquidation Penalty
            500, // 5% Liquidation Bonus
            1_000_000e18, // Max Exposure Cap
            18
        );

        // 5. Fund Liquidity Pool with 1,000,000 USDG (raw 6-decimal units)
        usdg.mint(admin, 1_000_000 * U);
        usdg.approve(address(pool), 1_000_000 * U);
        pool.deposit(1_000_000 * U, admin);

        // 6. Fund Users with Collateral & USDG
        stockToken.mint(alice, 100e18);
        usdg.mint(liquidator, 500_000 * U);
    }

    /* ==================== HELPERS ==================== */

    /// @dev Formats `v` with `d` decimals, e.g. 1000000012345678901 @18 -> "1.000000012345678901".
    function _fmt(uint256 v, uint8 d) internal pure returns (string memory) {
        uint256 unit = 10 ** uint256(d);
        bytes memory frac = bytes(vm.toString(v % unit));
        bytes memory zeros = new bytes(uint256(d) - frac.length);
        for (uint256 i; i < zeros.length; ++i) zeros[i] = "0";
        return
            string.concat(
                vm.toString(v / unit),
                ".",
                string(zeros),
                string(frac)
            );
    }

    function _logRevert(bytes memory reason) internal pure {
        bytes4 sel = bytes4(reason);
        console.log("REVERTED with selector:");
        console.logBytes4(sel);
        if (sel == RouterRepayShortfall.selector) {
            console.log("  = RouterRepayShortfall(requested, paid)");
        } else if (sel == NothingToRepay.selector) {
            console.log("  = NothingToRepay(beneficiary)");
        }
    }

    function _open(
        address user,
        uint256 stockAmt
    ) internal returns (uint256 pid) {
        stockToken.mint(user, stockAmt);
        vm.startPrank(user);
        stockToken.approve(address(creditLine), stockAmt);
        pid = creditLine.openPositionAndDeposit(address(stockToken), stockAmt);
        vm.stopPrank();
    }

    /// @param usdgAmt whole USDG (scaled by U inside)
    function _borrow(address user, uint256 pid, uint256 usdgAmt) internal {
        vm.prank(user);
        creditLine.borrow(pid, usdgAmt * U);
    }

    /// @param usdgAmt whole USDG (scaled by U inside)
    function _repay(address user, uint256 pid, uint256 usdgAmt) internal {
        vm.startPrank(user);
        usdg.approve(address(creditLine), usdgAmt * U);
        creditLine.repay(pid, usdgAmt * U);
        vm.stopPrank();
    }

    /// @dev Any write that runs _syncDebtIndex(). CreditLine has no public sync.
    function _touch(address user, uint256 pid) internal {
        stockToken.mint(user, 1e18);
        vm.startPrank(user);
        stockToken.approve(address(creditLine), 1e18);
        creditLine.depositCollateral(pid, address(stockToken), 1e18);
        vm.stopPrank();
    }

    /// @dev Index implied by the pool/router right now (what _syncDebtIndex would store).
    function _derivedIndex() internal view returns (uint256) {
        uint256 shares = creditLine.totalDebtShares();
        if (shares == 0) return creditLine.debtIndexWad();
        return
            router.currentTotalDebt().toWad(usdg.decimals()).wadDivDown(shares);
    }

    /// @dev Prints every layer from pool -> router -> credit line.
    function _snap(string memory tag, uint256 pid) internal view {
        console.log("");
        console.log(string.concat("---- ", tag, " ----"));
        console.log("block.timestamp         :", block.timestamp);
        console.log("pool.lastAccrual        :", pool.lastAccrualTimestamp());
        console.log(
            "cl.lastAccrual          :",
            creditLine.lastAccrualTimestamp()
        );
        console.log("pool.totalBorrows  (raw):", pool.totalBorrows());
        console.log("pool.currentDebt   (raw):", pool.currentDebt());
        console.log("router.totalDebt   (raw):", router.currentTotalDebt());
        console.log(
            "cl.totalDebtShares      :",
            _fmt(creditLine.totalDebtShares(), 18)
        );
        console.log(
            "cl.debtIndex  STORED    :",
            _fmt(creditLine.debtIndexWad(), 18)
        );
        console.log(
            "cl.debtIndex  LIVE      :",
            _fmt(creditLine.currentDebtIndexWad(), 18)
        );
        console.log("derived (router/shares) :", _fmt(_derivedIndex(), 18));
        console.log(
            "position debt      (WAD):",
            _fmt(creditLine.currentPositionDebt(pid), 18)
        );
    }

    /// @return gap derived - stored (index wei). Negative = stored is AHEAD of derived (guard blocks updates).
    function _gap(
        string memory tag
    ) internal view returns (int256 gap, uint256 stored) {
        stored = creditLine.debtIndexWad();
        uint256 derived = _derivedIndex();
        gap = int256(derived) - int256(stored);
        console.log(string.concat("[", tag, "]"));
        console.log("   stored :", _fmt(stored, 18));
        console.log("   derived:", _fmt(derived, 18));
        console.log("   gap (derived - stored, wei):", vm.toString(gap));
    }

    function _checkStep(
        string memory tag,
        uint256 prevStored
    ) internal view returns (uint256 stored) {
        int256 gap;
        (gap, stored) = _gap(tag);
        assertGe(
            gap,
            -GAP_TOL,
            string.concat(
                tag,
                ": derived index fell below stored (shares/debt diverged)"
            )
        );
        assertGt(
            stored,
            prevStored,
            string.concat(tag, ": stored index did not advance")
        );
    }

    /* ==================== CLOSE POSITION TESTS ==================== */

    function test_ClosePosition_FullFlow() public {
        uint256 depositCollateralAmount = 20e18;
        uint256 borrowUsdgAmount = 500;

        // 1. Open position and deposit collateral for Alice
        uint256 pid = _open(alice, depositCollateralAmount);

        // 2. Borrow USDG
        _borrow(alice, pid, borrowUsdgAmount);
        assertEq(usdg.balanceOf(alice), borrowUsdgAmount * U);
        assertGt(creditLine.currentPositionDebt(pid), 0);

        // 3. Fast forward time to accrue interest over 60 days
        vm.warp(block.timestamp + 60 days);

        uint256 debtWithInterestWad = creditLine.currentPositionDebt(pid);
        uint256 requiredUsdgToRepay = debtWithInterestWad.fromWadUp(
            usdg.decimals()
        );

        // Mint necessary USDG to Alice to cover accrued interest
        usdg.mint(alice, requiredUsdgToRepay);

        uint256 aliceStockBalanceBefore = stockToken.balanceOf(alice);

        // 4. Alice approves USDG & closes position
        vm.startPrank(alice);
        usdg.approve(address(creditLine), type(uint256).max);
        creditLine.closePosition(pid);
        vm.stopPrank();

        // 5. Assertions
        assertEq(creditLine.currentPositionDebt(pid), 0, "Debt should be zero");
        assertEq(creditLine.debtShares(pid), 0, "Debt shares should be zero");
        assertEq(
            creditLine.collateralOf(pid, address(stockToken)),
            0,
            "Collateral ledger balance should be 0"
        );
        assertEq(
            stockToken.balanceOf(alice) - aliceStockBalanceBefore,
            depositCollateralAmount,
            "Alice should have received full collateral back"
        );

        (address owner, bool isClosed, , , , , , uint64 closedAt) = creditLine
            .positions(pid);

        assertEq(owner, alice, "Owner matches");
        assertTrue(isClosed, "Position should be marked as closed");
        assertGt(closedAt, 0, "Closed timestamp should be recorded");
    }

    function test_ClosePosition_WithoutDebt() public {
        uint256 depositCollateralAmount = 10e18;
        uint256 pid = _open(alice, depositCollateralAmount);

        uint256 aliceStockBalanceBefore = stockToken.balanceOf(alice);

        vm.startPrank(alice);
        creditLine.closePosition(pid);
        vm.stopPrank();

        assertEq(creditLine.collateralOf(pid, address(stockToken)), 0);
        assertEq(
            stockToken.balanceOf(alice) - aliceStockBalanceBefore,
            depositCollateralAmount
        );

        (, bool isClosed, , , , , , ) = creditLine.positions(pid);
        assertTrue(isClosed, "Position without debt should be closed");
    }

    function test_ClosePosition_RevertsIfNotOwner() public {
        uint256 pid = _open(alice, 10e18);

        vm.expectRevert(
            abi.encodeWithSelector(NotPositionOwner.selector, pid, bob)
        );
        vm.prank(bob);
        creditLine.closePosition(pid);
    }

    /* ==================== POSITIONS & DEPOSITS ==================== */

    function test_OpenPositionAndDepositCollateral() public {
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);

        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );

        assertEq(positionId, 1);
        assertEq(
            creditLine.collateralOf(positionId, address(stockToken)),
            10e18
        );
        assertEq(stockToken.balanceOf(address(creditLine)), 10e18);
        vm.stopPrank();
    }

    function test_WithdrawCollateral_RevertsIfUnsafe() public {
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );

        // 10 stock * $150 = $1,500 -> @80% CF = $1,200 -> @90% cap = $1,080 limit
        creditLine.borrow(positionId, 1000 * U);

        vm.expectRevert(PositionUnsafeAfterWithdrawal.selector);
        creditLine.withdrawCollateral(positionId, address(stockToken), 5e18);
        vm.stopPrank();
    }

    /* ==================== BORROW & REPAYMENT ==================== */

    function test_Borrow_ExceedsCreditLimit_Reverts() public {
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ExceedsCreditLimit.selector,
                1200e18, // requested (WAD)
                1080e18 // limit (WAD)
            )
        );
        creditLine.borrow(positionId, 1200 * U);
        vm.stopPrank();
    }

    function test_BorrowAndRepay_Success() public {
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );

        creditLine.borrow(positionId, 500 * U);
        assertEq(usdg.balanceOf(alice), 500 * U);
        assertEq(creditLine.currentPositionDebt(positionId), 500e18);

        usdg.approve(address(creditLine), 500 * U);
        creditLine.repay(positionId, 500 * U);

        assertEq(creditLine.currentPositionDebt(positionId), 0);
        vm.stopPrank();
    }

    /* ==================== INTEREST ACCRUAL (original) ==================== */

    function test_InterestAccrual_IncreasesDebtOverTime() public {
        // 1. ALICE DEPOSITS & BORROWS AT DAY 0
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 100e18);
        uint256 alicePositionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            100e18
        );

        creditLine.borrow(alicePositionId, 10_000 * U);
        uint256 aliceInitialDebt = creditLine.currentPositionDebt(
            alicePositionId
        );

        uint256 initialIndex = creditLine.debtIndexWad();
        uint256 initialTimestamp = creditLine.lastAccrualTimestamp();
        uint256 initialTotalShares = creditLine.totalDebtShares();

        console.log("=== DAY 0: ALICE BORROW ===");
        console.log("Alice Initial Debt:    ", aliceInitialDebt);
        console.log("Debt Index WAD:        ", initialIndex);
        console.log("Last Accrual Timestamp:", initialTimestamp);
        console.log("Total Debt Shares:     ", initialTotalShares);
        vm.stopPrank();

        // 2. WARP 60 DAYS & BOB BORROWS (triggers _syncDebtIndex)
        vm.warp(block.timestamp + 60 days);

        stockToken.mint(bob, 100e18);

        vm.startPrank(bob);
        stockToken.approve(address(creditLine), 100e18);
        uint256 bobPositionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            100e18
        );

        creditLine.borrow(bobPositionId, 5_000 * U);

        uint256 bobInitialDebt = creditLine.currentPositionDebt(bobPositionId);
        uint256 aliceDebtAtDay60 = creditLine.currentPositionDebt(
            alicePositionId
        );
        uint256 day60Index = creditLine.debtIndexWad();
        uint256 day60Timestamp = creditLine.lastAccrualTimestamp();
        uint256 day60TotalShares = creditLine.totalDebtShares();

        console.log("\n=== DAY 60: BOB BORROW & INDEX SYNC ===");
        console.log("Debt Index WAD:        ", day60Index);
        console.log("Last Accrual Timestamp:", day60Timestamp);
        console.log("Total Debt Shares:     ", day60TotalShares);
        console.log("Alice Debt at Day 60:  ", aliceDebtAtDay60);
        console.log("Bob Initial Debt:      ", bobInitialDebt);
        console.log("Router Total Debt:     ", router.currentTotalDebt());
        console.log("Router Borrow APR:     ", router.currentBorrowAPR());

        assertTrue(
            day60Index > initialIndex,
            "Global debt index must grow after 60 days"
        );
        assertTrue(
            aliceDebtAtDay60 > aliceInitialDebt,
            "Alice debt must accrue interest over 60 days"
        );
        assertEq(
            day60Timestamp,
            block.timestamp,
            "Accrual timestamp must update to block.timestamp"
        );
        vm.stopPrank();

        // 3. WARP TO DAY 365 (remaining 305 days) and sync via a write
        vm.warp(block.timestamp + 305 days);

        stockToken.mint(bob, 1e18);
        vm.startPrank(bob);
        stockToken.approve(address(creditLine), 1e18);
        creditLine.depositCollateral(bobPositionId, address(stockToken), 1e18);
        vm.stopPrank();

        uint256 aliceFinalDebt = creditLine.currentPositionDebt(
            alicePositionId
        );
        uint256 bobFinalDebt = creditLine.currentPositionDebt(bobPositionId);
        uint256 finalIndex = creditLine.debtIndexWad();
        uint256 finalTimestamp = creditLine.lastAccrualTimestamp();

        console.log("\n=== DAY 365: FINAL ACCRUAL CHECK ===");
        console.log("Debt Index WAD:        ", finalIndex);
        console.log("Last Accrual Timestamp:", finalTimestamp);
        console.log("Alice Final Debt:      ", aliceFinalDebt);
        console.log("Bob Final Debt:        ", bobFinalDebt);
        console.log("Router Total Debt:     ", router.currentTotalDebt());
        console.log("Router Borrow APR:     ", router.currentBorrowAPR());

        assertTrue(
            finalIndex > day60Index,
            "Debt index must continue growing from day 60 to 365"
        );
        assertTrue(
            aliceFinalDebt > aliceDebtAtDay60,
            "Alice debt must accrue interest over the final 305 days"
        );
        assertTrue(
            bobFinalDebt > bobInitialDebt,
            "Bob debt must accrue interest over its 305 day lifetime"
        );

        uint256 aliceInterestAccrued = aliceFinalDebt - 10_000e18;
        uint256 bobInterestAccrued = bobFinalDebt - 5_000e18;

        console.log("\n=== ACCRUED INTEREST DELTAS ===");
        console.log("Alice Total Accrued Interest:", aliceInterestAccrued);
        console.log("Bob Total Accrued Interest:  ", bobInterestAccrued);

        assertTrue(
            aliceInterestAccrued > bobInterestAccrued,
            "Alice total accrued interest must exceed Bob's"
        );
    }

    /* ==================== LIQUIDATION ==================== */

    function test_Liquidation_WhenCollateralPriceDrops() public {
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );
        creditLine.borrow(positionId, 1000 * U);
        vm.stopPrank();

        // Value = 10 * $80 * 0.85 = $680 < $1,000 debt -> liquidatable
        oracle.setPrice(address(stockToken), 80e18);

        assertTrue(
            riskEngine.isLiquidatable(
                address(creditLine),
                positionId,
                creditLine.currentPositionDebt(positionId)
            )
        );

        // close factor 50% -> max $500
        vm.startPrank(liquidator);
        usdg.approve(address(creditLine), 500 * U);

        uint256 liquidatorBalanceBefore = stockToken.balanceOf(liquidator);
        creditLine.liquidate(positionId, address(stockToken), 500 * U);
        uint256 liquidatorBalanceAfter = stockToken.balanceOf(liquidator);

        assertTrue(liquidatorBalanceAfter > liquidatorBalanceBefore);
        vm.stopPrank();
    }

    /* ==================== DIAGNOSTICS ==================== */

    /// A. The core question: does currentPositionDebt grow with time and NO write?
    function test_A_LiveViewAccruesWithoutAnyWrite() public {
        console.log("USDG decimals:", usdg.decimals());
        uint256 pid = _open(alice, 100e18);
        _borrow(alice, pid, 5_000);
        _snap("A0: right after borrow", pid);

        uint256 debt0 = creditLine.currentPositionDebt(pid);
        uint256 storedIdx0 = creditLine.debtIndexWad();

        uint256 t0 = block.timestamp;
        vm.warp(t0 + 30 days);
        _snap("A1: +30d, NO write since borrow", pid);
        console.log(
            "router.currentBorrowAPR (bps):",
            router.currentBorrowAPR()
        );

        uint256 debt1 = creditLine.currentPositionDebt(pid);
        uint256 live1 = creditLine.currentDebtIndexWad();

        // Stored var only moves on a write (by design).
        assertEq(
            creditLine.debtIndexWad(),
            storedIdx0,
            "stored index moved without a write"
        );
        // The LIVE view must reflect interest.
        assertGt(live1, storedIdx0, "LIVE index did not grow (view is frozen)");
        assertGt(debt1, debt0, "currentPositionDebt did not grow with time");

        // A write must sync the stored index to exactly what the view reported.
        _touch(alice, pid);
        _snap("A2: after a write (_syncDebtIndex ran)", pid);
        assertEq(creditLine.debtIndexWad(), live1, "stored != live after sync");
        assertEq(
            creditLine.currentPositionDebt(pid),
            debt1,
            "debt changed across the sync"
        );
    }

    /// B. Time ladder: how small a change is visible, with no writes.
    function test_B_TimeLadder_NoWrites() public {
        uint256 pid = _open(alice, 100e18);
        _borrow(alice, pid, 5_000);

        uint256 t0 = block.timestamp;
        uint256 baseDebt = creditLine.currentPositionDebt(pid);
        uint256 rawStep = 10 ** (18 - uint256(usdg.decimals()));
        console.log("principal (WAD):", _fmt(baseDebt, 18));
        console.log("1 raw USDG unit = this many WAD wei:", rawStep);

        uint256[8] memory steps = [
            uint256(0),
            1,
            60,
            1 hours,
            1 days,
            7 days,
            30 days,
            365 days
        ];
        uint256 prev = baseDebt;
        uint256 debt;
        for (uint256 i; i < steps.length; ++i) {
            vm.warp(t0 + steps[i]);
            debt = creditLine.currentPositionDebt(pid);
            console.log(
                string.concat(
                    "+",
                    vm.toString(steps[i]),
                    " sec after last write"
                )
            );
            console.log("   debt (WAD):", _fmt(debt, 18));
            console.log(
                "   accrued (raw USDG units):",
                (debt - baseDebt) / rawStep
            );
            assertGe(debt, prev, "debt went DOWN as time advanced");
            prev = debt;
        }
        assertGt(debt, baseDebt, "no accrual visible even after 365 days");
    }

    /// C. Pool writes its own accrual (LP deposit). Credit line view must not change.
    function test_C_PoolSideAccrualDoesNotDesyncCreditLineView() public {
        uint256 pid = _open(alice, 100e18);
        _borrow(alice, pid, 5_000);
        uint256 t0 = block.timestamp;
        vm.warp(t0 + 30 days);

        uint256 liveBefore = creditLine.currentDebtIndexWad();
        uint256 routerDebtBefore = router.currentTotalDebt();
        uint256 borrowsBefore = pool.totalBorrows();
        _snap("C0: before LP deposit", pid);

        usdg.mint(admin, 10 * U);
        usdg.approve(address(pool), 10 * U);
        pool.deposit(10 * U, admin);

        _snap("C1: after LP deposit (pool wrote its accrual)", pid);

        assertGt(
            pool.totalBorrows(),
            borrowsBefore,
            "pool did not write accrual on LP deposit"
        );
        assertEq(
            router.currentTotalDebt(),
            routerDebtBefore,
            "router debt changed when pool wrote accrual"
        );
        assertEq(
            creditLine.currentDebtIndexWad(),
            liveBefore,
            "live index changed when pool wrote accrual"
        );
    }

    /// D. Stored index must keep advancing through borrows/repays and never fall behind derived.
    function test_D_IndexKeepsAdvancingAcrossBorrowRepaySequence() public {
        uint256 a = _open(alice, 100e18);
        uint256 b = _open(bob, 100e18);
        uint256 t = block.timestamp;
        int256 gap;
        uint256 prevStored;

        _borrow(alice, a, 5_000);
        (gap, prevStored) = _gap("D1 t0: alice borrows 5000 (first borrow)");
        assertGe(gap, -GAP_TOL, "D1: derived below stored");

        t += 10 days;
        vm.warp(t);
        _borrow(bob, b, 2_000);
        prevStored = _checkStep("D2 +10d: bob borrows 2000", prevStored);

        t += 10 days;
        vm.warp(t);
        _repay(alice, a, 1_000);
        prevStored = _checkStep("D3 +10d: alice repays 1000", prevStored);

        t += 10 days;
        vm.warp(t);
        _borrow(bob, b, 1_000);
        prevStored = _checkStep("D4 +10d: bob borrows 1000", prevStored);

        t += 10 days;
        vm.warp(t);
        _repay(alice, a, 500);
        prevStored = _checkStep("D5 +10d: alice repays 500", prevStored);

        t += 10 days;
        vm.warp(t);
        _touch(alice, a);
        prevStored = _checkStep(
            "D6 +10d: plain sync via depositCollateral",
            prevStored
        );
    }

    /// E. Repay the FULL debt (principal + interest) after interest accrued.
    ///    Router tracks `borrowedFrom` as principal only -> expected to revert if that is the bug.
    function test_E_FullRepayAfterInterest() public {
        uint256 pid = _open(alice, 100e18);
        _borrow(alice, pid, 1_000);
        uint256 t0 = block.timestamp;
        vm.warp(t0 + 365 days);

        uint256 debtWad = creditLine.currentPositionDebt(pid);
        uint256 repayRaw = debtWad.fromWadUp(usdg.decimals());
        console.log(
            "router principal borrowedFrom (raw):",
            router.borrowedFrom(alice, address(pool))
        );
        console.log("debt incl. interest (WAD):", _fmt(debtWad, 18));
        console.log("amount needed to clear it (raw):", _fmt(repayRaw, 6));

        usdg.mint(alice, 100 * U); // cover the interest on top of the 1,000 borrowed

        vm.startPrank(alice);
        usdg.approve(address(creditLine), repayRaw);
        bool ok;
        try creditLine.repay(pid, repayRaw) {
            ok = true;
            console.log("RESULT: full repay SUCCEEDED");
        } catch (bytes memory reason) {
            console.log("RESULT: full repay FAILED");
            _logRevert(reason);
        }
        vm.stopPrank();

        assertTrue(ok, "full repay (principal + interest) reverted");
    }

    /// F. Repay exactly the principal, then try to clear the leftover interest.
    function test_F_PrincipalRepaidButInterestUnpayable() public {
        uint256 pid = _open(alice, 100e18);
        _borrow(alice, pid, 1_000);
        uint256 t0 = block.timestamp;
        vm.warp(t0 + 30 days);

        usdg.mint(alice, 100 * U);

        _repay(alice, pid, 1_000); // principal only
        uint256 remainingWad = creditLine.currentPositionDebt(pid);
        console.log(
            "remaining debt after repaying principal (WAD):",
            _fmt(remainingWad, 18)
        );
        console.log("pool.currentDebt (raw):", pool.currentDebt());
        console.log(
            "router principal borrowedFrom (raw):",
            router.borrowedFrom(alice, address(pool))
        );
        assertGt(
            remainingWad,
            0,
            "expected leftover interest after repaying principal"
        );

        uint256 restRaw = remainingWad.fromWadUp(usdg.decimals());
        console.log("attempting to repay leftover (raw):", restRaw);

        vm.startPrank(alice);
        usdg.approve(address(creditLine), restRaw);
        bool ok;
        try creditLine.repay(pid, restRaw) {
            ok = true;
            console.log("RESULT: leftover interest repaid");
        } catch (bytes memory reason) {
            console.log("RESULT: leftover interest CANNOT be repaid");
            _logRevert(reason);
        }
        vm.stopPrank();

        assertTrue(
            ok,
            "interest remaining after principal repayment could not be repaid"
        );
    }

    /// G.
    function test_G_OneBorrowersRepayDoesNotTouchAnothers() public {
        uint256 a = _open(alice, 100e18);
        uint256 b = _open(bob, 100e18);
        _borrow(alice, a, 5_000);
        vm.warp(block.timestamp + 10 days);
        _borrow(bob, b, 2_000);
        vm.warp(block.timestamp + 20 days);

        uint256 bobBefore = router.totalDebtOf(bob);

        // Alice clears her whole debt (principal + interest).
        uint256 aliceDebtRaw = creditLine.currentPositionDebt(a).fromWadUp(
            usdg.decimals()
        );
        usdg.mint(alice, 100 * U);
        vm.startPrank(alice);
        usdg.approve(address(creditLine), aliceDebtRaw);
        creditLine.repay(a, aliceDebtRaw);
        vm.stopPrank();

        assertEq(creditLine.currentPositionDebt(a), 0, "alice not cleared");
        assertEq(router.totalDebtOf(alice), 0, "router still shows alice debt");

        uint256 bobAfter = router.totalDebtOf(bob);
        console.log("bob debt before (raw):", bobBefore);
        console.log("bob debt after  (raw):", bobAfter);

        // Core invariant: someone else's repayment must never INCREASE my debt...
        assertLe(
            bobAfter,
            bobBefore,
            "bob's debt INCREASED after alice repaid"
        );
        // ...and it may only fall by rounding dust (<= 1 raw unit per repayment).
        assertLe(
            bobBefore - bobAfter,
            1,
            "bob's debt dropped by more than rounding dust"
        );

        // Router per-borrower debt must match the credit line's own figure (within rounding).
        assertApproxEqAbs(
            bobAfter,
            creditLine.currentPositionDebt(b) / 1e12,
            2,
            "router vs credit line debt diverged"
        );
    }
}
