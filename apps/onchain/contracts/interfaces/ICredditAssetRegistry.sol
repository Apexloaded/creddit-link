// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/*****************************************************************
 * STRUCT DEFINITIONS
 *****************************************************************/

/// @notice Struct to store asset configuration
/// @param token Address of the ERC20 collateral token
/// @param collateralFactorBps Maximum loan-to-value (LTV) ratio for the asset as a percentage (e.g., 7000 for 70%)
/// @param liquidationThresholdBps Threshold in basis points (1/100th of a percent) at which collateral becomes eligible for liquidation
/// @param liquidationPenaltyBps Penalty applied to the user's position upon liquidation (paid to liquidators/protocol) as basis points
/// @param liquidationBonusBps Bonus (in addition to penalty) paid to liquidators for successful liquidation as basis points
/// @param maxExposure Maximum total value (in USD equivalent) of this asset that can be supplied as collateral across the entire protocol
/// @param decimals Number of decimal places for the ERC20 token (e.g., 18 for standard tokens, 6 for USDC, etc.)
/// @param isEnabled Boolean indicating whether the asset is currently active and can be used as collateral
/// @param isListed Boolean indicating whether the asset has been added to the registry
struct AssetConfig {
    address token;
    uint16 collateralFactorBps;
    uint16 liquidationThresholdBps;
    uint16 liquidationPenaltyBps;
    uint16 liquidationBonusBps;
    uint256 maxExposure;
    uint8 decimals;
    bool isEnabled;
    bool isListed;
}

/*****************************************************************
 * EVENT DEFINITIONS
 *****************************************************************/

/// @notice Emitted when a new asset is added to the registry
/// @param token The address of the token.
/// @param collateralFactorBps The collateral factor in basis points.
/// @param liquidationThresholdBps The liquidation threshold in basis points.
/// @param liquidationPenaltyBps The liquidation penalty in basis points.
/// @param liquidationBonusBps The liquidation bonus in basis points.
/// @param maxExposure The maximum exposure for the asset.
event AssetAdded(
    address indexed token,
    uint16 collateralFactorBps,
    uint16 liquidationThresholdBps,
    uint16 liquidationPenaltyBps,
    uint16 liquidationBonusBps,
    uint256 maxExposure
);

/// @notice Emitted when an asset's risk parameters are updated.
/// @param token The address of the token.
/// @param collateralFactorBps The collateral factor in basis points.
/// @param liquidationThresholdBps The liquidation threshold in basis points.
/// @param liquidationPenaltyBps The liquidation penalty in basis points.
/// @param liquidationBonusBps The liquidation bonus in basis points.
event AssetRiskParamsUpdated(
    address indexed token,
    uint16 collateralFactorBps,
    uint16 liquidationThresholdBps,
    uint16 liquidationPenaltyBps,
    uint16 liquidationBonusBps
);

/// @notice Emitted when an asset enable status is toggled.
/// @param token The address of the token.
/// @param isEnabled The new enabled status.
event AssetEnabledStatusUpdated(address indexed token, bool isEnabled);

/// @notice Emitted when an asset's max exposure is updated.
/// @param token The address of the token.
/// @param maxExposure The new max exposure.
event AssetMaxExposureUpdated(address indexed token, uint256 maxExposure);

/*****************************************************************
 * INTERFACE DEFINITIONS
 *****************************************************************/

/// @title ICredditAssetRegistry
/// @notice Interface for the CredditAssetRegistry contract.
interface ICredditAssetRegistry {
    /// @notice Gets the configuration for an asset.
    /// @param token The address of the token.
    /// @return The configuration for the asset.
    function getAsset(address token) external view returns (AssetConfig memory);

    /// @notice Returns a list of all listed assets, optionally filtered to only include enabled assets.
    /// @param onlyEnabled If true, only enabled assets will be returned. If false, all listed assets will be returned.
    /// @return An array of AssetConfig structs for the listed assets.
    function listAssets(
        bool onlyEnabled
    ) external view returns (AssetConfig[] memory);
}
