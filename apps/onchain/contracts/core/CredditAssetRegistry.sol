// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CredditCore} from "./CredditCore.sol";
import {ZeroAddressProvided, InvalidDecimals, AssetNotEnabled} from "./CredditErrors.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";

/// @notice Custom Errors for the CredditAssetRegistry contract
error AssetNotListed(address token);
error AssetAlreadyListed(address token);
error InvalidMaxExposure(uint256 maxExposure);
error ZeroFactor();
error CollateralFactorTooHigh(uint16 factor);
error InvalidLiquidationThreshold(uint16 threshold);
error LiquidationThresholdTooLow(
    uint16 collateralFactor,
    uint16 liquidationThreshold
);
error InvalidLiquidationPenalty(uint16 penalty);
error InvalidLiquidationBonus(uint16 bonus);
error LiquidationThresholdTooHigh(uint256 liquidationThresholdBps);

/// @title CredditAssetRegistry
/// @notice Canonical allowlist for collateral assets. Only ASSET_ADMIN_ROLE can
/// add, update, or remove assets.
contract CredditAssetRegistry is CredditCore {
    using WadMath for uint256;

    // ==========================================
    // Risk Engine Constants
    // ==========================================
    /// @dev Absolute ceiling for max LTV (e.g., 85% for crypto, ~70% max recommended for RWAs)
    uint16 public constant MAX_COLLATERAL_FACTOR_BPS = 8_500;

    /// @dev Minimum required buffer between Liquidation Threshold and Collateral Factor (e.g., 5.00% = 500 BPS)
    /// @notice Essential for RWA stocks to prevent immediate liquidation on market-open gap risk
    uint16 public constant MIN_SAFETY_MARGIN_BPS = 500;

    /// @dev Cap on total penalty charged to borrowers (e.g., 15.00% max)
    uint16 public constant MAX_LIQUIDATION_PENALTY_BPS = 1_500;

    /// @dev Minimum penalty to ensure liquidators have enough incentive after protocol cut
    uint16 public constant MIN_LIQUIDATION_PENALTY_BPS = 200; // 2.00%

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

    /// @dev Mapping from token address to its configuration.
    mapping(address => AssetConfig) public assetConfig;

    /// @dev Array of all assets in the registry.
    address[] private _assets;

    /// @notice Initialized only once when the contract is deployed.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @dev These roles allow the admin to add, update, or remove assets from the registry.
    function initialize(address admin) external initializer {
        if (admin == address(0)) revert ZeroAddressProvided();
        __CredditCore_init(admin);
        _grantRole(CredditRoles.ASSET_ADMIN_ROLE, admin);
    }

    /// @notice Adds a new asset to the registry.
    /// @param token The address of the token.
    /// @param collateralFactorBps The collateral factor in basis points.
    /// @param liquidationThresholdBps The liquidation threshold in basis points.
    /// @param liquidationPenaltyBps The liquidation penalty in basis points.
    /// @param liquidationBonusBps The liquidation bonus in basis points.
    /// @param maxExposure The maximum exposure for the asset.
    /// @param decimals The number of decimals for the asset.
    function addAsset(
        address token,
        uint16 collateralFactorBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps,
        uint16 liquidationBonusBps,
        uint256 maxExposure,
        uint8 decimals
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) {
        if (maxExposure == 0) revert InvalidMaxExposure(maxExposure);
        if (decimals > 30) revert InvalidDecimals(decimals); // Revert unreasonable precision (e.g. >18 or >30)

        if (token == address(0)) revert ZeroAddressProvided();
        if (assetConfig[token].isListed) revert AssetAlreadyListed(token);

        _validateRiskParams(
            collateralFactorBps,
            liquidationThresholdBps,
            liquidationPenaltyBps,
            liquidationBonusBps
        );

        bool isNewAsset = assetConfig[token].token == address(0);

        assetConfig[token] = AssetConfig(
            token,
            collateralFactorBps,
            liquidationThresholdBps,
            liquidationPenaltyBps,
            liquidationBonusBps,
            maxExposure,
            decimals,
            true,
            true
        );

        if (isNewAsset) {
            _assets.push(token);
        }

        emit AssetAdded(
            token,
            collateralFactorBps,
            liquidationThresholdBps,
            liquidationPenaltyBps,
            liquidationBonusBps,
            maxExposure
        );
    }

    /// @notice Removes an asset from the registry.
    /// @param token The address of the token.
    /// @dev This function will revert if the asset is not listed or if the asset is not enabled.
    /// @dev This function will also revert if the asset is not paused.
    function removeAsset(
        address token
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) {
        if (!assetConfig[token].isListed) revert AssetNotListed(token);
        if (!assetConfig[token].isEnabled) revert AssetNotEnabled(token);
        assetConfig[token].isListed = false;
        assetConfig[token].isEnabled = false;
    }

    /// @notice Updates an asset in the registry.
    /// @param token The address of the token.
    /// @dev This function will revert if the asset is not listed or if the asset is not enabled.
    function updateAssetRiskParams(
        address token,
        uint16 collateralFactorBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps,
        uint16 liquidationBonusBps
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) {
        if (!assetConfig[token].isListed) revert AssetNotListed(token);
        if (!assetConfig[token].isEnabled) revert AssetNotEnabled(token);
        _validateRiskParams(
            collateralFactorBps,
            liquidationThresholdBps,
            liquidationPenaltyBps,
            liquidationBonusBps
        );

        assetConfig[token].collateralFactorBps = collateralFactorBps;
        assetConfig[token].liquidationThresholdBps = liquidationThresholdBps;
        assetConfig[token].liquidationPenaltyBps = liquidationPenaltyBps;
        assetConfig[token].liquidationBonusBps = liquidationBonusBps;

        emit AssetRiskParamsUpdated(
            token,
            collateralFactorBps,
            liquidationThresholdBps,
            liquidationPenaltyBps,
            liquidationBonusBps
        );
    }

    /// @notice Sets the maximum exposure for an asset.
    /// @param token The address of the token.
    /// @param maxExposure The new maximum exposure.
    /// @dev This function will revert if the asset is not listed or if the asset is not enabled.
    function setMaxExposure(
        address token,
        uint256 maxExposure
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) {
        if (!assetConfig[token].isListed) revert AssetNotListed(token);
        if (!assetConfig[token].isEnabled) revert AssetNotEnabled(token);
        assetConfig[token].maxExposure = maxExposure;
        emit AssetMaxExposureUpdated(token, maxExposure);
    }

    /// @notice Toggles an asset's enabled status.
    /// @param token The address of the token.
    /// @dev This function will revert if the asset is not listed.
    function toggleEnableStatus(
        address token
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) {
        if (!assetConfig[token].isListed) revert AssetNotListed(token);
        assetConfig[token].isEnabled = !assetConfig[token].isEnabled;
        emit AssetEnabledStatusUpdated(token, assetConfig[token].isEnabled);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Gets the configuration for an asset.
    /// @param token The address of the token.
    /// @return The configuration for the asset.
    /// @dev Reverts if the asset is not listed.
    function getAsset(
        address token
    ) external view returns (AssetConfig memory) {
        if (!assetConfig[token].isListed) revert AssetNotListed(token);
        return assetConfig[token];
    }

    /// @notice Returns all listed assets in the registry.
    /// @param onlyEnabled If true, returns only assets that are enabled.
    /// @return An array of AssetConfig structs for all listed assets.
    function listAssets(
        bool onlyEnabled
    ) public view returns (AssetConfig[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _assets.length; i++) {
            AssetConfig memory config = assetConfig[_assets[i]];
            if (config.isListed && (config.isEnabled || !onlyEnabled)) {
                count++;
            }
        }

        AssetConfig[] memory assetsToReturn = new AssetConfig[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _assets.length; i++) {
            AssetConfig memory config = assetConfig[_assets[i]];
            if (config.isListed && (config.isEnabled || !onlyEnabled)) {
                assetsToReturn[index] = config;
                index++;
            }
        }

        return assetsToReturn;
    }

    /// @notice Checks if an asset is listed in the registry.
    /// @param token The address of the token.
    /// @return True if the asset is listed, false otherwise.
    function isListed(address token) public view returns (bool) {
        return assetConfig[token].isListed;
    }

    /// @notice Checks if an asset is enabled for collateral, rewards and deposits.
    /// @param token The address of the token.
    /// @return True if the asset is enabled, false otherwise.
    /// @dev Reverts if the asset is not listed.
    function isEnabled(address token) public view returns (bool) {
        if (!assetConfig[token].isListed) revert AssetNotListed(token);
        return assetConfig[token].isEnabled;
    }

    /// @notice Returns the number of listed assets in the registry.
    /// @return The number of listed assets.
    function assetCount() public view returns (uint256) {
        return _assets.length;
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/

    /// @notice Validates risk parameters for an asset before listing or updating.
    /// @param collateralFactorBps Max LTV (Loan-To-Value) in basis points
    /// @param liquidationThresholdBps Liquidation health trigger in basis points
    /// @param liquidationPenaltyBps Total percentage loss charged to borrower on liquidation
    /// @param liquidationBonusBps Share of penalty given to liquidator/auction winner
    function _validateRiskParams(
        uint16 collateralFactorBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps,
        uint16 liquidationBonusBps
    ) internal pure {
        // 1. Non-zero Factor Validation
        if (collateralFactorBps == 0 || liquidationThresholdBps == 0) {
            revert ZeroFactor();
        }

        // 2. Collateral Factor & Liquidation Threshold Bounds
        if (collateralFactorBps > MAX_COLLATERAL_FACTOR_BPS) {
            revert CollateralFactorTooHigh(collateralFactorBps);
        }

        // 3. Enforce Ordering AND Safety Margin: collateralFactorBps + MIN_SAFETY_MARGIN_BPS <= liquidationThresholdBps
        if (
            liquidationThresholdBps <
            collateralFactorBps + MIN_SAFETY_MARGIN_BPS
        ) {
            revert LiquidationThresholdTooLow(
                collateralFactorBps,
                liquidationThresholdBps
            );
        }

        // 4. Enforce Liquidation Threshold capped below 100%
        if (liquidationThresholdBps > uint16(WadMath.MAX_BPS)) {
            revert LiquidationThresholdTooHigh(liquidationThresholdBps);
        }

        // 5. Penalty & Bonus Range Validation
        if (
            liquidationPenaltyBps < MIN_LIQUIDATION_PENALTY_BPS ||
            liquidationPenaltyBps > MAX_LIQUIDATION_PENALTY_BPS
        ) {
            revert InvalidLiquidationPenalty(liquidationPenaltyBps);
        }

        // 6. Liquidation Bonus relative to Penalty
        if (liquidationBonusBps > liquidationPenaltyBps) {
            revert InvalidLiquidationBonus(liquidationBonusBps);
        }
    }
}
