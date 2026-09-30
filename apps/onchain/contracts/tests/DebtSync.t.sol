// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {console} from "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {CredditCreditLine} from "../core/CredditCreditLine.sol";
import {CredditInterestRateModel} from "../core/CredditInterestRateModel.sol";
import {CredditLendingRouter} from "../core/CredditLendingRouter.sol";
import {CredditLiquidityPool} from "../core/CredditLiquidityPool.sol";
import {CredditRiskEngine} from "../core/CredditRiskEngine.sol";
import {CredditAssetRegistry} from "../core/CredditAssetRegistry.sol";
import {CredditTreasury} from "../core/CredditTreasury.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockOracle} from "../mock/MockOracle.sol";

import {MaxExposureExceeded, TooManyCollateralAssets, InsufficientCollateralBalance, PositionUnsafeAfterWithdrawal, NoActiveDebt, ExceedsCreditLimit, PositionNotLiquidatable, PositionDoesNotExist, NotPositionOwner} from "../core/CredditCreditLine.sol";

contract CredditSystemTest is Test {
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

    function setUp() public {
        // 1. Deploy Tokens & Oracle
        usdg = new MockERC20("USD Stablecoin", "USDG", 6, admin);
        stockToken = new MockERC20("Apple Stock Token", "aAAPL", 18, admin);
        oracle = new MockOracle();

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

        // 5. Fund Liquidity Pool with 1,000,000 USDG
        usdg.mint(admin, 1_000_000e18);
        usdg.approve(address(pool), 1_000_000e18);
        pool.deposit(1_000_000e18, admin);

        // 6. Fund Users with Collateral & USDG
        stockToken.mint(alice, 100e18);
        usdg.mint(liquidator, 500_000e18);
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

        // Max Credit Limit calculation:
        // 10 stock * $150 = $1,500 collateral value
        // Risk Adjusted @ 80% CF = $1,200
        // Credit Limit @ 90% utilization cap = $1,080
        creditLine.borrow(positionId, 1000e18);

        // Attempting to withdraw 5 tokens should revert as remaining collateral cannot support debt
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

        // Attempting to borrow above max limit ($1,080)
        vm.expectRevert(
            abi.encodeWithSelector(
                ExceedsCreditLimit.selector,
                1200e18,
                1080e18
            )
        );
        creditLine.borrow(positionId, 1200e18);
        vm.stopPrank();
    }

    function test_BorrowAndRepay_Success() public {
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );

        creditLine.borrow(positionId, 500e18);
        assertEq(usdg.balanceOf(alice), 500e18);
        assertEq(creditLine.positionDebt(positionId), 500e18);

        usdg.approve(address(creditLine), 500e18);
        creditLine.repay(positionId, 500e18);

        assertEq(creditLine.positionDebt(positionId), 0);
        vm.stopPrank();
    }

    /* ==================== INTEREST ACCRUAL ==================== */

    function test_InterestAccrual_IncreasesDebtOverTime() public {
        // =========================================================================
        // 1. ALICE DEPOSITS & BORROWS AT DAY 0
        // =========================================================================
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 100e18);
        uint256 alicePositionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            100e18
        );

        creditLine.borrow(alicePositionId, 10_000e18);
        uint256 aliceInitialDebt = creditLine.positionDebt(alicePositionId);

        uint256 initialIndex = creditLine.debtIndexWad();
        uint256 initialTimestamp = creditLine.lastAccrualTimestamp();
        uint256 initialTotalShares = creditLine.totalDebtShares();

        console.log("=== DAY 0: ALICE BORROW ===");
        console.log("Alice Initial Debt:    ", aliceInitialDebt);
        console.log("Debt Index WAD:        ", initialIndex);
        console.log("Last Accrual Timestamp:", initialTimestamp);
        console.log("Total Debt Shares:     ", initialTotalShares);
        vm.stopPrank();

        // =========================================================================
        // 2. WARP FORWARD 60 DAYS & BOB BORROWS (Triggers _syncDebtIndex)
        // =========================================================================
        vm.warp(block.timestamp + 60 days);

        // Mint collateral for Bob
        stockToken.mint(bob, 100e18);

        vm.startPrank(bob);
        stockToken.approve(address(creditLine), 100e18);
        uint256 bobPositionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            100e18
        );

        // _syncDebtIndex() runs inside openPositionAndDeposit / borrow
        creditLine.borrow(bobPositionId, 5_000e18);

        uint256 bobInitialDebt = creditLine.positionDebt(bobPositionId);
        uint256 aliceDebtAtDay60 = creditLine.positionDebt(alicePositionId);
        uint256 day60Index = creditLine.debtIndexWad();
        uint256 day60Timestamp = creditLine.lastAccrualTimestamp();
        uint256 day60TotalShares = creditLine.totalDebtShares();

        console.log("\n=== DAY 60: BOB BORROW & INDEX SYNC ===");
        console.log("Debt Index WAD:        ", day60Index);
        console.log("Last Accrual Timestamp:", day60Timestamp);
        console.log("Total Debt Shares:     ", day60TotalShares);
        console.log("Alice Debt at Day 60:  ", aliceDebtAtDay60);
        console.log("Bob Initial Debt:      ", bobInitialDebt);
        console.log("Router Total Debt:   ", router.currentTotalDebt());
        console.log("Router Borrow APR:    ", router.currentBorrowAPR());
        // Diagnostics / Assertions for Day 60
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

        // =========================================================================
        // 3. WARP FORWARD TO DAY 365 (Remaining 305 Days)
        // =========================================================================
        vm.warp(block.timestamp + 305 days);

        // Trigger _syncDebtIndex via an action (e.g. Bob depositing 1 wei of collateral)
        // since CredditCreditLine doesn't expose a public syncDebtIndex()
        stockToken.mint(bob, 1e18);
        vm.startPrank(bob);
        stockToken.approve(address(creditLine), 1e18);
        creditLine.depositCollateral(bobPositionId, address(stockToken), 1e18);
        vm.stopPrank();

        uint256 aliceFinalDebt = creditLine.positionDebt(alicePositionId);
        uint256 bobFinalDebt = creditLine.positionDebt(bobPositionId);
        uint256 finalIndex = creditLine.debtIndexWad();
        uint256 finalTimestamp = creditLine.lastAccrualTimestamp();

        console.log("\n=== DAY 365: FINAL ACCRUAL CHECK ===");
        console.log("Debt Index WAD:        ", finalIndex);
        console.log("Last Accrual Timestamp:", finalTimestamp);
        console.log("Alice Final Debt:      ", aliceFinalDebt);
        console.log("Bob Final Debt:        ", bobFinalDebt);
        console.log("Router Total Debt:   ", router.currentTotalDebt());
        console.log("Router Borrow APR:    ", router.currentBorrowAPR());
        // =========================================================================
        // 4. ROOT CAUSE DIAGNOSTIC ASSERTIONS
        // =========================================================================
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

        // Interest accrual deltas
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
        // 1. Setup position for Alice
        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 10e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            10e18
        );
        creditLine.borrow(positionId, 1000e18);
        vm.stopPrank();

        // 2. Stock price drops from $150 to $80
        // Liquidation Threshold = 85%. Value = 10 * $80 * 0.85 = $680. Debt = $1,000 -> Liquidatable!
        oracle.setPrice(address(stockToken), 80e18);

        assertTrue(
            riskEngine.isLiquidatable(
                address(creditLine),
                positionId,
                creditLine.positionDebt(positionId)
            )
        );

        // 3. Liquidator executes liquidation (close factor is 50%, so max debt to cover is $500)
        vm.startPrank(liquidator);
        usdg.approve(address(creditLine), 500e18);

        uint256 liquidatorBalanceBefore = stockToken.balanceOf(liquidator);
        creditLine.liquidate(positionId, address(stockToken), 500e18);
        uint256 liquidatorBalanceAfter = stockToken.balanceOf(liquidator);

        assertTrue(liquidatorBalanceAfter > liquidatorBalanceBefore);
        vm.stopPrank();
    }
}
