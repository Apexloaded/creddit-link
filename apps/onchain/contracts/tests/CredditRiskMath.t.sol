// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {CreditRiskMath} from "../libraries/CreditRiskMath.sol";
import {WadMath} from "../libraries/WadMath.sol";

/* =========================================================================
 * TEST HARNESS FOR INTERNAL LIBRARY FUNCTIONS
 * ========================================================================= */

contract CreditRiskMathHarness {
    using CreditRiskMath for uint256;

    function riskAdjustedValue(
        uint256 valueWad,
        uint256 collateralFactorWad
    ) external pure returns (uint256) {
        return CreditRiskMath.riskAdjustedValue(valueWad, collateralFactorWad);
    }

    function creditLimit(
        uint256 riskAdjustedPortfolioValueWad,
        uint256 utilizationCapWad
    ) external pure returns (uint256) {
        return CreditRiskMath.creditLimit(riskAdjustedPortfolioValueWad, utilizationCapWad);
    }

    function isLiquidatable(
        uint256 liquidationWeightedCollateralWad,
        uint256 debtWad
    ) external pure returns (bool) {
        return CreditRiskMath.isLiquidatable(liquidationWeightedCollateralWad, debtWad);
    }

    function collateralToSeize(
        uint256 debtRepaidUsdWad,
        uint256 collateralPriceWad,
        uint16 liquidationPenaltyBps,
        uint8 tokenDecimals
    ) external pure returns (uint256) {
        return CreditRiskMath.collateralToSeize(
            debtRepaidUsdWad,
            collateralPriceWad,
            liquidationPenaltyBps,
            tokenDecimals
        );
    }

    function calculateMaxCoverableDebt(
        uint256 availableCollateral,
        uint256 collateralPriceWad,
        uint256 usdgPriceWad,
        uint16 liquidationPenaltyBps,
        uint8 collateralDecimals
    ) external pure returns (uint256) {
        return CreditRiskMath.calculateMaxCoverableDebt(
            availableCollateral,
            collateralPriceWad,
            usdgPriceWad,
            liquidationPenaltyBps,
            collateralDecimals
        );
    }
}

/* =========================================================================
 * TEST SUITE
 * ========================================================================= */

contract CreditRiskMathTest is Test {
    CreditRiskMathHarness public harness;

    uint256 public constant WAD = 1e18;

    function setUp() public {
        harness = new CreditRiskMathHarness();
    }

    /* =========================================================================
     * RISK ADJUSTED VALUE TESTS
     * ========================================================================= */

    function test_RiskAdjustedValue_Basic() public view {
        // Portfolio value: $10,000 WAD, Collateral Factor: 80% (0.8 WAD)
        // Risk Adjusted Value = $8,000 WAD
        uint256 value = harness.riskAdjustedValue(10_000e18, 0.8e18);
        assertEq(value, 8_000e18);
    }

    function test_RiskAdjustedValue_RoundsDownInFavorOfProtocol() public view {
        // (1e18 - 1) * 0.8e18 / 1e18 = 0.799999999999999999... -> rounds down
        uint256 value = harness.riskAdjustedValue(1e18 - 1, 0.8e18);
        assertEq(value, 0.8e18 - 1);
    }

    /* =========================================================================
     * CREDIT LIMIT TESTS
     * ========================================================================= */

    function test_CreditLimit_Basic() public view {
        // Risk-adjusted collateral: $8,000 WAD, Utilization cap: 90% (0.9 WAD)
        // Credit limit = $7,200 WAD
        uint256 limit = harness.creditLimit(8_000e18, 0.9e18);
        assertEq(limit, 7_200e18);
    }

    function test_CreditLimit_RoundsDown() public view {
        uint256 limit = harness.creditLimit(1e18 - 1, 0.9e18);
        assertEq(limit, 0.9e18 - 1);
    }

    /* =========================================================================
     * IS LIQUIDATABLE TESTS
     * ========================================================================= */

    function test_IsLiquidatable_ZeroDebt() public view {
        // Zero debt is never liquidatable regardless of collateral
        assertFalse(harness.isLiquidatable(0, 0));
        assertFalse(harness.isLiquidatable(1000e18, 0));
    }

    function test_IsLiquidatable_HealthyPosition() public view {
        // Liq-weighted collateral = $10,000, Debt = $8,000
        assertFalse(harness.isLiquidatable(10_000e18, 8_000e18));
    }

    function test_IsLiquidatable_ExactlyAtThreshold() public view {
        // Debt == Collateral threshold -> Not liquidatable (Health Factor == 1.0)
        assertFalse(harness.isLiquidatable(10_000e18, 10_000e18));
    }

    function test_IsLiquidatable_Undercollateralized() public view {
        // Debt > Collateral threshold -> Liquidatable
        assertTrue(harness.isLiquidatable(10_000e18, 10_000e18 + 1));
        assertTrue(harness.isLiquidatable(10_000e18, 12_000e18));
    }

    /* =========================================================================
     * COLLATERAL TO SEIZE TESTS
     * ========================================================================= */

    function test_CollateralToSeize_Basic_18Decimals() public view {
        // Debt Repaid: $1,000 USD
        // Collateral Price: $100 USD / token
        // Penalty: 10% (1,000 bps) -> Multiplier = 1.1x
        // Seize Value = $1,100 USD
        // Seize Tokens = $1,100 / $100 = 11 tokens (11e18)
        uint256 seized = harness.collateralToSeize(1_000e18, 100e18, 1000, 18);
        assertEq(seized, 11e18);
    }

    function test_CollateralToSeize_6Decimals_USDC() public view {
        // Debt Repaid: $1,000 USD
        // Collateral Price: $1 USD / token
        // Penalty: 5% (500 bps) -> Multiplier = 1.05x
        // Seize Value = $1,050 USD
        // Seize Tokens = 1,050 USDC (1,050e6)
        uint256 seized = harness.collateralToSeize(1_000e18, 1e18, 500, 6);
        assertEq(seized, 1_050e6);
    }

    function test_CollateralToSeize_RoundsUpInFavorOfProtocol() public view {
        // Tiny debt repayment produces fractional token amount that rounds UP
        uint256 seized = harness.collateralToSeize(1, 100e18, 1000, 18);
        assertEq(seized, 1);
    }

    /* =========================================================================
     * CALCULATE MAX COVERABLE DEBT TESTS
     * ========================================================================= */

    function test_CalculateMaxCoverableDebt_ZeroCollateral() public view {
        uint256 maxDebt = harness.calculateMaxCoverableDebt(0, 100e18, 1e18, 1000, 18);
        assertEq(maxDebt, 0);
    }

    function test_CalculateMaxCoverableDebt_18Decimals() public view {
        // Available Collateral: 11 tokens (11e18)
        // Collateral Price: $100 USD / token -> Total Value: $1,100 USD
        // USDG Price: $1 USD
        // Penalty: 10% (1000 bps)
        // Max Debt USD = $1,100 / 1.1 = $1,000 USDG
        uint256 maxDebt = harness.calculateMaxCoverableDebt(11e18, 100e18, 1e18, 1000, 18);
        assertEq(maxDebt, 1_000e18);
    }

    function test_CalculateMaxCoverableDebt_6Decimals_USDC() public view {
        // Available Collateral: 1,050 USDC (1050e6)
        // Price: $1 USD, USDG Price: $1 USD
        // Penalty: 5% (500 bps)
        // Max Debt USD = $1,050 / 1.05 = 1,000 USDG
        uint256 maxDebt = harness.calculateMaxCoverableDebt(1_050e6, 1e18, 1e18, 500, 6);
        assertEq(maxDebt, 1_000e18);
    }

    function test_CalculateMaxCoverableDebt_SymmetryWithCollateralToSeize() public view {
        // If maxDebtToCover is repaid, the seized collateral should be <= available collateral
        uint256 availCollateral = 50e18;
        uint256 colPrice = 150e18;
        uint256 usdgPrice = 1e18;
        uint16 penaltyBps = 1000;
        uint8 decimals = 18;

        uint256 maxDebtToCover = harness.calculateMaxCoverableDebt(
            availCollateral,
            colPrice,
            usdgPrice,
            penaltyBps,
            decimals
        );

        uint256 debtInUsd = WadMath.wadMulDown(maxDebtToCover, usdgPrice);
        uint256 collateralSeized = harness.collateralToSeize(
            debtInUsd,
            colPrice,
            penaltyBps,
            decimals
        );

        assertTrue(collateralSeized <= availCollateral);
    }

    /* =========================================================================
     * FUZZ TESTS
     * ========================================================================= */

    function testFuzz_CalculateMaxCoverableDebt_NeverExceedsAvailable(
        uint256 availCollateral,
        uint256 colPrice,
        uint256 usdgPrice,
        uint16 penaltyBps
    ) public view {
        availCollateral = bound(availCollateral, 1e6, 1e30);
        colPrice = bound(colPrice, 1e16, 1e22);      // $0.01 to $10,000
        usdgPrice = bound(usdgPrice, 0.9e18, 1.1e18); // Pegged around $1
        penaltyBps = uint16(bound(penaltyBps, 0, 5000)); // 0% to 50%

        uint8 decimals = 18;

        uint256 maxDebt = harness.calculateMaxCoverableDebt(
            availCollateral,
            colPrice,
            usdgPrice,
            penaltyBps,
            decimals
        );

        uint256 debtInUsd = WadMath.wadMulDown(maxDebt, usdgPrice);
        uint256 seized = harness.collateralToSeize(
            debtInUsd,
            colPrice,
            penaltyBps,
            decimals
        );

        assertTrue(seized <= availCollateral);
    }
}