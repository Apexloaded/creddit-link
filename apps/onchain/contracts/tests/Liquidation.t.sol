// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {console} from "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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

contract LiquidationTest is Test {
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
    address public liquidator = address(0x111C);

    /// @dev One whole USDG in raw token units (10 ** usdg.decimals()).
    uint256 internal U;

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

    /* ==================== LIQUIDATION ==================== */

    function test_Liquidation_WhenCollateralPriceDrops() public {
        console.log(
            "\n========================================================"
        );
        console.log("=== SCENARIO: $30M BORROW & 360-DAY DEBT LIQUIDATION ===");
        console.log("========================================================");

        // 1. Setup liquidity pool & collateral
        uint256 poolDeposit = 50_000_000 * U;
        usdg.mint(admin, poolDeposit);
        usdg.approve(address(pool), poolDeposit);
        pool.deposit(poolDeposit, admin);

        stockToken.mint(alice, 100_000e18);
        oracle.setPrice(address(stockToken), 500e18);

        vm.startPrank(alice);
        stockToken.approve(address(creditLine), 100_000e18);
        uint256 positionId = creditLine.openPositionAndDeposit(
            address(stockToken),
            100_000e18
        );

        uint256 borrowAmount = 30_000_000 * U;
        creditLine.borrow(positionId, borrowAmount);
        vm.stopPrank();

        {
            uint256 initialDebtWad = creditLine.currentPositionDebt(positionId);
            console.log("\n[Day 0] Alice Position Created:");
            console.log(
                "  Initial Debt Borrowed:",
                _fmt(borrowAmount, 6),
                "USDG"
            );
            console.log(
                "  Initial Position Debt:",
                _fmt(initialDebtWad, 18),
                "WAD USDG"
            );
            console.log(
                "  Is Liquidatable?      ",
                riskEngine.isLiquidatable(
                    address(creditLine),
                    positionId,
                    initialDebtWad
                )
                    ? "YES"
                    : "NO"
            );
        }

        // 2. Warp time by 360 days
        console.log("\n[Time Warp] Fast forwarding 360 days...");
        vm.warp(block.timestamp + 360 days);

        uint256 debtAfter360DaysWad = creditLine.currentPositionDebt(
            positionId
        );

        {
            uint256 initialDebtWad = creditLine.currentPositionDebt(positionId);
            uint256 accruedInterestWad = debtAfter360DaysWad - initialDebtWad;
            console.log("\n[Day 360] Position Status Before Price Drop:");
            console.log(
                "  Position Debt (WAD): ",
                _fmt(debtAfter360DaysWad, 18),
                "USDG"
            );
            console.log(
                "  Accrued Interest:    ",
                _fmt(accruedInterestWad, 18),
                "USDG"
            );
            console.log(
                "  Is Liquidatable?     ",
                riskEngine.isLiquidatable(
                    address(creditLine),
                    positionId,
                    debtAfter360DaysWad
                )
                    ? "YES"
                    : "NO"
            );
        }

        // 3. Drop collateral price
        console.log(
            "\n[Market Shock] Collateral price drops from $500 to $320..."
        );
        oracle.setPrice(address(stockToken), 320e18);

        bool liquidatableNow = riskEngine.isLiquidatable(
            address(creditLine),
            positionId,
            debtAfter360DaysWad
        );
        console.log(
            "  Is Position Liquidatable Now?",
            liquidatableNow ? "YES" : "NO"
        );
        assertTrue(
            liquidatableNow,
            "Position must be liquidatable after market drop"
        );

        // 4. Liquidation Execution
        uint256 debtToCoverTokens;
        {
            uint256 closeFactorWad = riskEngine.liquidationCloseFactorWad();
            uint256 maxDebtToCoverWad = debtAfter360DaysWad.wadMulDown(
                closeFactorWad
            );
            debtToCoverTokens = maxDebtToCoverWad.fromWadUp(usdg.decimals());

            console.log("\n[Liquidation Plan]:");
            console.log("  Close Factor:        50%");
            console.log(
                "  Max Debt To Cover:   ",
                _fmt(maxDebtToCoverWad, 18),
                "USDG"
            );
            console.log(
                "  Debt To Cover Tokens:",
                _fmt(debtToCoverTokens, 6),
                "USDG"
            );
        }

        usdg.mint(liquidator, debtToCoverTokens);

        vm.startPrank(liquidator);
        usdg.approve(address(creditLine), debtToCoverTokens);

        uint256 liquidatorUsdgBefore = usdg.balanceOf(liquidator);
        uint256 liquidatorStockBefore = stockToken.balanceOf(liquidator);
        uint256 treasuryStockBefore = stockToken.balanceOf(address(treasury));

        console.log("\n[Executing Liquidation Call]...");
        creditLine.liquidate(
            positionId,
            address(stockToken),
            debtToCoverTokens
        );
        vm.stopPrank();

        uint256 liquidatorUsdgAfter = usdg.balanceOf(liquidator);
        uint256 liquidatorStockAfter = stockToken.balanceOf(liquidator);
        uint256 treasuryStockAfter = stockToken.balanceOf(address(treasury));
        uint256 remainingDebtWad = creditLine.currentPositionDebt(positionId);

        console.log("\n[Day 360] Post-Liquidation Results:");
        console.log(
            "  USDG Spent by Liquidator:  ",
            _fmt(liquidatorUsdgBefore - liquidatorUsdgAfter, 6),
            "USDG"
        );
        console.log(
            "  Stock Seized by Liquidator:",
            _fmt(liquidatorStockAfter - liquidatorStockBefore, 18),
            "aAAPL"
        );
        console.log(
            "  Protocol Fee to Treasury:  ",
            _fmt(treasuryStockAfter - treasuryStockBefore, 18),
            "aAAPL"
        );
        console.log(
            "  Remaining Position Debt:   ",
            _fmt(remainingDebtWad, 18),
            "WAD USDG"
        );

        assertTrue(
            liquidatorStockAfter > liquidatorStockBefore,
            "Liquidator should receive seized collateral"
        );
        assertTrue(
            treasuryStockAfter >= treasuryStockBefore,
            "Treasury should receive protocol fee"
        );
        assertTrue(
            remainingDebtWad < debtAfter360DaysWad,
            "Position debt should be reduced"
        );
    }
}