// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/*****************************************************************
 * STRUCT DEFINITIONS
 *****************************************************************/

/// @notice Struct to store collateral details for a position
struct CollateralDetail {
    string symbol;
    address asset;
    uint256 amount;
    uint256 priceInUsd;
}

/// @notice Unified data structure representing a complete position summary.
struct PositionSummary {
    uint256 positionId;
    address owner;
    uint256 debtWad;
    uint256 collateralValueWad;
    uint256 creditLimitUsd;
    uint256 liquidationValueWad;
    uint256 healthFactorWad; // (Liquidation Value / Debt) in WAD (1e18 = 100% health threshold)
    bool isLiquidatable;
    bool isClosed;
    bool isStale; // True if any collateral price is stale
    bool isValid; // True if all collaterals are valid
    bool isLiquidated;
    uint256 cumulativeBorrowed;
    uint256 cumulativeRepaid;
    uint64 liquidatedAt;
    uint64 openedAt;
    uint64 closedAt;
    CollateralDetail[] collaterals;
}

/// @notice Struct to store portfolio summary for a user
struct PortfolioSummary {
    uint256 totalPositionsCount;
    uint256 totalRawCollateralUsd;
    uint256 totalDebtUsd;
    uint256 liquidityBalance;
    uint256 totalCreditLimitUsd;
    uint256 totalLiquidationValueUsd;
    uint256 netBorrowingPowerUsd; // totalCreditLimitUsd - totalDebtUsd
    uint256 totalHealthFactorWad;
    uint256 weightedLtvBps;
    bool hasAtRiskPosition; // True if ANY position is liquidatable
    bool isStale; // True if any collateral price is stale
}

/// @notice Struct to store market information for an asset
struct MarketInfo {
    address asset;
    string symbol;
    uint8 decimals;
    uint16 collateralFactorBps;
    uint16 liquidationThresholdBps;
    uint16 liquidationPenaltyBps;
    uint16 liquidationBonusBps;
    uint256 maxExposure;
    uint256 priceInUsd;
    uint256 totalDepositedValueUsd;
    uint256 totalDepositedAmount;
    uint256 totalBorrowedValueUsd;
    uint256 totalBorrowedAmount;
    bool isEnabled;
    bool isListed;
}
