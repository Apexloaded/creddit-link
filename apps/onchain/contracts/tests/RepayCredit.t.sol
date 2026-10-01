// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {console} from "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {CredditCreditLine} from "../core/CredditCreditLine.sol";
import {CredditInterestRateModel} from "../core/CredditInterestRateModel.sol";
import {CredditLendingRouter} from "../core/CredditLendingRouter.sol";
import {CredditLiquidityPool} from "../core/CredditLiquidityPool.sol";
import {CredditRiskEngine} from "../core/CredditRiskEngine.sol";
import {CredditAssetRegistry} from "../core/CredditAssetRegistry.sol";
import {CredditTreasury} from "../core/CredditTreasury.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockOracle} from "../mock/MockOracle.sol";

contract Borrow50MAndRepayTest is Test {
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
    MockERC20 public collateralToken;
    MockOracle public oracle;

    // Test Users
    address public admin = address(this);
    address public borrower = address(0xA11CE);

    /// @dev One whole USDG token unit (10 ** 6)
    uint256 internal U;

    function setUp() public {
        // 1. Deploy Tokens & Oracle
        usdg = new MockERC20("USD Stablecoin", "USDG", 6, admin);
        collateralToken = new MockERC20(
            "Apple Stock Token",
            "aAAPL",
            18,
            admin
        );
        oracle = new MockOracle();
        U = 10 ** uint256(usdg.decimals());

        oracle.setPrice(address(usdg), 1e18); // $1.00 USDG
        oracle.setPrice(address(collateralToken), 100e18); // $100.00 Collateral Price

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
                            0.90e18, // 90% utilization cap
                            5,
                            0.50e18
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
                                baseRateWad: 0.02e18, // 2% base
                                kinkWad: 0.80e18, // 80% kink
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

        // 4. Configure Roles and Wiring
        router.setCreditLine(address(creditLine));
        router.setAdapter(address(pool), true);
        pool.setRouter(address(router));

        // Use valid risk parameters (80% Collateral Factor, 85% Liquidation Threshold)
        registry.addAsset(
            address(collateralToken),
            8000, // 80% Collateral Factor (Max allowed by registry)
            8500, // 85% Liquidation Threshold
            1000, // 10% Liquidation Penalty
            500, // 5% Liquidation Bonus
            1_000_000_000e18, // $1B Max Exposure Cap
            18
        );

        // 5. Seed Pool with $100M USDG (6-decimal raw units)
        usdg.mint(admin, 100_000_000 * U);
        usdg.approve(address(pool), 100_000_000 * U);
        pool.deposit(100_000_000 * U, admin);
    }

    function test_Borrow50M_AndFullRepayAfter365Days() public {
        uint256 borrowUSD = 51_471_000;
        // 1M shares @ $100 = $100M Collateral. At 80% CF ($80M) & 90% Cap = $72M Borrow Limit
        uint256 collateralAmt = 1_000_000 * 1e18;

        // --- STEP 1: Open Position & Borrow $50M USD ---
        collateralToken.mint(borrower, collateralAmt);

        vm.startPrank(borrower);
        collateralToken.approve(address(creditLine), collateralAmt);

        uint256 pid = creditLine.openPositionAndDeposit(
            address(collateralToken),
            collateralAmt
        );

        creditLine.borrow(pid, borrowUSD * U);
        vm.stopPrank();

        uint256 initialDebtWad = creditLine.currentPositionDebt(pid);

        _logHeader("1. INITIAL BORROW STATE");
        _logUSDFromWad("Borrowed Principal", borrowUSD * 1e18);
        _logUSDFromWad("Recorded Initial Debt", initialDebtWad);
        _logUSDFromToken(
            "Borrower USDG Token Balance",
            usdg.balanceOf(borrower)
        );

        // --- STEP 2: Fast-Forward 365 Days ---
        vm.warp(block.timestamp + 365 days);

        uint256 debtAfter365DaysWad = creditLine.currentPositionDebt(pid);
        uint256 accruedInterestWad = debtAfter365DaysWad - initialDebtWad;

        _logHeader("2. ACCRUAL STATE AFTER 365 DAYS");
        _logUSDFromWad(
            "Total Debt Owed (Principal + Interest)",
            debtAfter365DaysWad
        );
        _logUSDFromWad("Accrued Interest (1 Year)", accruedInterestWad);

        // Calculate total USDG required in token raw units (ceiling rounded)
        uint256 totalRepayRaw = debtAfter365DaysWad.fromWadUp(usdg.decimals());

        // Mint extra USDG to cover accrued interest
        usdg.mint(borrower, totalRepayRaw - usdg.balanceOf(borrower));

        _logHeader("3. EXECUTING FULL REPAYMENT");
        _logUSDFromToken("Total USDG Prepared for Repay", totalRepayRaw);

        // --- STEP 3: Execute Repayment ---
        vm.startPrank(borrower);
        usdg.approve(address(creditLine), totalRepayRaw);

        // Attempt full repayment using Option A
        creditLine.repay(pid, totalRepayRaw);
        vm.stopPrank();

        // --- STEP 4: Assertions & Post-Repayment Status ---
        uint256 remainingDebtWad = creditLine.currentPositionDebt(pid);
        uint256 userUsdgBalanceAfter = usdg.balanceOf(borrower);

        _logHeader("4. POST-REPAYMENT VERIFICATION");
        _logUSDFromWad("Remaining Position Debt", remainingDebtWad);
        _logUSDFromToken(
            "Borrower USDG Balance Leftover",
            userUsdgBalanceAfter
        );

        assertEq(
            remainingDebtWad,
            0,
            "Position debt must be cleanly wiped to 0"
        );
        assertEq(creditLine.debtShares(pid), 0, "Debt shares must be zeroed");
    }

    function test_FullRepayWithMetamaskDelayAndBuffer() public {
        uint256 borrowUSD = 50_000_000;
        uint256 collateralAmt = 1_000_000 * 1e18; // 1M units @ $100 = $100M Collateral

        // --- STEP 1: Borrow $50M USD ---
        collateralToken.mint(borrower, collateralAmt);

        vm.startPrank(borrower);
        collateralToken.approve(address(creditLine), collateralAmt);
        uint256 pid = creditLine.openPositionAndDeposit(
            address(collateralToken),
            collateralAmt
        );
        creditLine.borrow(pid, borrowUSD * U);
        vm.stopPrank();

        // Fast-forward 1 year
        vm.warp(block.timestamp + 365 days);

        // --- STEP 2: DApp UI Reads Debt & Applies 0.1% Buffer ---
        uint256 debtWadUI = creditLine.currentPositionDebt(pid);
        uint256 baseDebtTokens = debtWadUI.fromWadUp(usdg.decimals());

        // Calculate 0.1% Buffer (+0.1% = 1001 / 1000)
        uint256 bufferedAmount = (baseDebtTokens * 1001) / 1000;
        uint256 bufferValueOnly = bufferedAmount - baseDebtTokens;

        _logHeader("1. METAMASK MODAL OPENED (UI SNAPSHOT)");
        _logUSDFromWad("Real-Time Debt in UI", debtWadUI);
        _logUSDFromToken("Calculated 0.1% Buffer (+10 bps)", bufferValueOnly);
        _logUSDFromToken("Total Approved USDG Amount", bufferedAmount);

        // Mint required extra tokens to borrower (base debt + buffer)
        usdg.mint(borrower, bufferedAmount - usdg.balanceOf(borrower));

        // --- STEP 3: Metamask Delay (60 Seconds On-Chain Delay) ---
        uint256 timeBeforeMined = block.timestamp;
        vm.warp(block.timestamp + 60 seconds);

        uint256 debtWhenMinedWad = creditLine.currentPositionDebt(pid);
        uint256 delayInterestAccrued = debtWhenMinedWad - debtWadUI;

        _logHeader("2. TRANSACTION MINED AFTER 60s DELAY");
        console.log("Time Passed Pending in Mempool: 60 seconds");
        _logUSDFromWad("Interest Accrued During Delay", delayInterestAccrued);
        _logUSDFromWad("Actual Debt Owed at Block Time", debtWhenMinedWad);

        // --- STEP 4: Execute Repayment ---
        vm.startPrank(borrower);
        usdg.approve(address(creditLine), bufferedAmount);
        creditLine.repay(pid, bufferedAmount);
        vm.stopPrank();

        // --- STEP 5: Verification & Log Results ---
        uint256 remainingDebtWad = creditLine.currentPositionDebt(pid);
        uint256 unusedBufferRefund = usdg.balanceOf(borrower);

        _logHeader("3. POST-REPAYMENT RESULTS");
        _logUSDFromWad("Remaining Position Debt", remainingDebtWad);
        _logUSDFromToken(
            "Unused Buffer Refunded to Wallet",
            unusedBufferRefund
        );

        // Assertions
        assertEq(
            remainingDebtWad,
            0,
            "Position debt must be cleanly wiped to 0"
        );
        assertTrue(
            unusedBufferRefund > 0,
            "Unused buffer amount must remain safely in user wallet"
        );
    }

    /* ==================== DISPLAY HELPERS ==================== */

    /* ==================== DISPLAY HELPERS ==================== */

    function _logHeader(string memory title) internal pure {
        console.log("");
        console.log(string.concat("========== ", title, " =========="));
    }

    function _logUSDFromWad(
        string memory label,
        uint256 wadValue
    ) internal pure {
        uint256 whole = wadValue / 1e18;
        uint256 frac = (wadValue % 1e18) / 1e14; // Extract 4 decimal places

        string memory fracStr = _padFourDigits(frac);
        console.log(
            string.concat(label, ": $", _addCommas(whole), ".", fracStr, " USD")
        );
    }

    function _logUSDFromToken(
        string memory label,
        uint256 tokenValue
    ) internal pure {
        uint256 whole = tokenValue / 1e6;
        uint256 frac = (tokenValue % 1e6) / 100; // Extract 4 decimal places

        string memory fracStr = _padFourDigits(frac);
        console.log(
            string.concat(label, ": $", _addCommas(whole), ".", fracStr, " USD")
        );
    }

    /// @dev Formats fractional part as a clean 4-digit zero-padded string
    function _padFourDigits(uint256 val) internal pure returns (string memory) {
        if (val == 0) return "0000";
        if (val < 10) return string.concat("000", vm.toString(val));
        if (val < 100) return string.concat("00", vm.toString(val));
        if (val < 1000) return string.concat("0", vm.toString(val));
        return vm.toString(val);
    }

    function _addCommas(uint256 val) internal pure returns (string memory) {
        if (val == 0) return "0";
        bytes memory str = bytes(vm.toString(val));
        uint256 len = str.length;
        uint256 commas = (len - 1) / 3;
        bytes memory result = new bytes(len + commas);

        uint256 rIdx = result.length;
        uint256 count = 0;

        for (int256 i = int256(len) - 1; i >= 0; i--) {
            if (count > 0 && count % 3 == 0) {
                result[--rIdx] = ",";
            }
            result[--rIdx] = str[uint256(i)];
            count++;
        }

        return string(result);
    }
}
