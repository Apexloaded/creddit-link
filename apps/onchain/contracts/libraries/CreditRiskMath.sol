// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WadMath} from "./WadMath.sol";

/// @title CreditRiskMath
/// @notice Pure, independently-testable risk calculations (Section 13/14).
/// All inputs/outputs are WAD (1e18) scaled USD values or WAD fractions unless
/// otherwise noted. Rounding is always chosen to favor protocol safety.
library CreditRiskMath {
    using WadMath for uint256;

    /// @notice Risk-adjusted value of a single collateral holding.
    /// @dev valueWad * collateralFactorWad, rounded DOWN — understating a
    /// user's borrowing power is the safe direction (Section 14).
    function riskAdjustedValue(
        uint256 valueWad,
        uint256 collateralFactorWad
    ) internal pure returns (uint256) {
        return valueWad.wadMulDown(collateralFactorWad);
    }

    /// @notice Maximum credit given total risk-adjusted collateral and the
    /// protocol-wide utilization cap.
    /// @dev Rounded DOWN — never grant more credit than conservatively earned.
    function creditLimit(
        uint256 riskAdjustedPortfolioValueWad,
        uint256 utilizationCapWad
    ) internal pure returns (uint256) {
        return riskAdjustedPortfolioValueWad.wadMulDown(utilizationCapWad);
    }

    /// @notice True if a position's debt has reached its liquidation-weighted
    /// collateral value, i.e. healthFactor < 1e18.
    function isLiquidatable(
        uint256 liquidationWeightedCollateralWad,
        uint256 debtWad
    ) internal pure returns (bool) {
        if (debtWad == 0) return false;
        // Compare cross-multiplied to avoid an extra division/rounding step:
        // debt > liqWeightedCollateral  <=>  healthFactor < 1.
        return debtWad > liquidationWeightedCollateralWad;
    }

    /// @notice Collateral (in the seized asset's own token units) owed to a
    /// liquidator repaying `debtRepaidWad` of USD debt at `priceWad` USD/token,
    /// including `liquidationPenaltyBps`.
    /// @dev Rounded UP in favor of the protocol (i.e. the liquidator receives no
    /// more than conservatively computed; any dust favors the protocol/pool).
    function collateralToSeize(
        uint256 debtRepaidUsdWad,
        uint256 collateralPriceWad,
        uint16 liquidationPenaltyBps,
        uint8 tokenDecimals
    ) internal pure returns (uint256 tokenAmount) {
        // Convert bps to WAD delta (e.g. 1000 bps -> 0.1e18)
        uint256 rateWad = uint256(liquidationPenaltyBps).bpsToWad();

        // Multiplier = 1.0e18 + rateWad (e.g. 1.1e18)
        uint256 multiplierWad = WadMath.WAD + rateWad;

        // USD Value of collateral = debtRepaidUsdWad * multiplier
        uint256 seizeValueUsdWad = debtRepaidUsdWad.wadMulUp(multiplierWad);

        // Convert USD value to collateral token units
        uint256 seizeWad = seizeValueUsdWad.wadDivUp(collateralPriceWad);

        // Convert 18-decimal WAD to native token decimals
        tokenAmount = seizeWad.fromWadUp(tokenDecimals);
    }

    /// @notice Calculates the maximum debt (in WAD) that can be covered given a specific available collateral balance.
    /// @param availableCollateral The raw user collateral balance (in asset native decimals).
    /// @param collateralPriceWad The price of the collateral asset in USD (18 decimals).
    /// @param usdgPriceWad The price of USDG in USD (18 decimals).
    /// @param liquidationPenaltyBps The penalty fee in basis points (e.g., 500 for 5%).
    /// @param collateralDecimals The native decimals of the collateral token.
    /// @return maxDebtToCoverWad The maximum debt WAD (18 decimals) that this available collateral can cover.
    function calculateMaxCoverableDebt(
        uint256 availableCollateral,
        uint256 collateralPriceWad,
        uint256 usdgPriceWad,
        uint16 liquidationPenaltyBps,
        uint8 collateralDecimals
    ) internal pure returns (uint256 maxDebtToCoverWad) {
        if (availableCollateral == 0) return 0;

        // 1. Convert native collateral balance to USD Value (WAD)
        uint256 availableCollateralWad = availableCollateral.toWad(
            collateralDecimals
        );
        uint256 collateralUsdValueWad = availableCollateralWad.wadMulDown(
            collateralPriceWad
        );

        // 2. Re-derive max coverable USD debt value backwards:
        // Collateral USD = Debt USD * (1 + PenaltyRate)
        // Debt USD = Collateral USD / (1 + PenaltyRate)
        uint256 penaltyRateWad = uint256(liquidationPenaltyBps).bpsToWad();
        uint256 maxDebtUsdWad = collateralUsdValueWad.wadDivDown(
            WadMath.WAD + penaltyRateWad
        );

        // 3. Convert USD value into USDG debt WAD
        maxDebtToCoverWad = maxDebtUsdWad.wadDivDown(usdgPriceWad);
    }
}
