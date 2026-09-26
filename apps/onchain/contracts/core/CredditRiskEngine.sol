// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CredditCore} from "./CredditCore.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";
import {CredditAssetRegistry} from "./CredditAssetRegistry.sol";
import {ICollateralSource} from "../interfaces/ICollateralSource.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {CreditRiskMath} from "../libraries/CreditRiskMath.sol";

/// @notice Custom errors for the CredditOracle contract
error InvalidCapBps(uint256 cap);

/// @title CredditRiskEngine
/// @notice The CredditLink protocol risk engine contract.
/// @dev It is responsible for all risk calculations and risk management operations.
contract CredditRiskEngine is CredditCore {
    using WadMath for uint256;

    /// @dev Reference to the asset registry contract.
    CredditAssetRegistry public registry;

    /// @dev Reference to the oracle contract.
    IPriceOracle public oracle;

    /// @notice WAD fraction of risk-adjusted collateral value a user may borrow
    /// against, e.g. 0.90e18 = 90%.
    uint256 public creditUtilizationCapWad;
    /// @notice Max distinct collateral assets a single user may hold, bounding
    /// gas for portfolio iteration.
    uint256 public maxCollateralAssetsPerUser;
    /// @notice Max fraction of a position's debt that can be repaid in a single
    /// liquidation call, WAD fraction.
    uint256 public liquidationCloseFactorWad;

    /// @notice Emitted when the credit utilization cap is updated.
    /// @param newCapWad The new credit utilization cap.
    event UtilizationCapUpdated(uint256 newCapWad);

    /// @notice Emitted when the maximum number of collateral assets per user is updated.
    /// @param newMax The new maximum number of collateral assets per user.
    event MaxCollateralAssetsUpdated(uint256 newMax);

    /// @notice Emitted when the liquidation close factor is updated.
    /// @param newCloseFactorWad The new liquidation close factor.
    event LiquidationCloseFactorUpdated(uint256 newCloseFactorWad);

    /// @notice Initialized only once when the contract is deployed.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param _assetRegistry The address of the asset registry contract.
    /// @param _oracle The address of the oracle contract.
    /// @param _creditUtilizationCapWad The WAD fraction of risk-adjusted collateral value a user may borrow against, e.g. 0.90e18 = 90%.
    /// @param _maxCollateralAssetsPerUser The max distinct collateral assets a single user may hold, bounding gas for portfolio iteration.
    /// @param _liquidationCloseFactorWad The max fraction of a position's debt that can be repaid in a single liquidation call, WAD fraction.
    function initialize(
        address admin,
        address _assetRegistry,
        address _oracle,
        uint256 _creditUtilizationCapWad,
        uint256 _maxCollateralAssetsPerUser,
        uint256 _liquidationCloseFactorWad
    ) external initializer {
        if (
            admin == address(0) ||
            _assetRegistry == address(0) ||
            _oracle == address(0)
        ) revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant RISK_ADMIN_ROLE to the admin
        _grantRole(CredditRoles.RISK_ADMIN_ROLE, admin);

        // Initialize registry and oracle
        registry = CredditAssetRegistry(_assetRegistry);
        oracle = IPriceOracle(_oracle);

        // Initialize risk parameters
        creditUtilizationCapWad = _creditUtilizationCapWad;
        maxCollateralAssetsPerUser = _maxCollateralAssetsPerUser;
        liquidationCloseFactorWad = _liquidationCloseFactorWad;
    }

    /// @notice Updates the credit utilization cap.
    /// @param newCapWad The new credit utilization cap.
    function setCreditUtilizationCap(
        uint256 newCapWad
    ) external onlyRole(CredditRoles.RISK_ADMIN_ROLE) {
        if (newCapWad == 0 || newCapWad > WadMath.WAD)
            revert InvalidCapBps(newCapWad);
        creditUtilizationCapWad = newCapWad;
        emit UtilizationCapUpdated(newCapWad);
    }

    /// @notice Updates the maximum number of collateral assets per user.
    /// @param newMax The new maximum number of collateral assets per user.
    function setMaxCollateralAssetsPerUser(
        uint256 newMax
    ) external onlyRole(CredditRoles.RISK_ADMIN_ROLE) {
        maxCollateralAssetsPerUser = newMax;
        emit MaxCollateralAssetsUpdated(newMax);
    }

    /// @notice Updates the liquidation close factor.
    /// @param newCloseFactorWad The new liquidation close factor.
    function setLiquidationCloseFactor(
        uint256 newCloseFactorWad
    ) external onlyRole(CredditRoles.RISK_ADMIN_ROLE) {
        if (newCloseFactorWad == 0 || newCloseFactorWad > WadMath.WAD)
            revert InvalidCapBps(newCloseFactorWad);
        liquidationCloseFactorWad = newCloseFactorWad;
        emit LiquidationCloseFactorUpdated(newCloseFactorWad);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Calculates the credit limit for a specific user and collateral source.
    /// @dev The strict version that checks for oracle price staleness and validity.
    /// @dev Use this function in your smart contracts strictly. Do not use creditLimitSafe().
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @return The credit limit for the user.
    function creditLimit(
        address source,
        address user
    ) public view returns (uint256) {
        uint256 total;
        (total, , ) = riskAdjustedValue(source, user, false);
        return CreditRiskMath.creditLimit(total, creditUtilizationCapWad);
    }

    /// @notice Calculates the credit limit for a specific user and collateral source.
    /// @dev The safe version does not revert for oracle price staleness and validity.
    /// @dev Use this function to query credit limit in dapps only.
    /// @dev Do not use this function to calculate credit limit in your smart contracts; use creditLimit() instead.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @return limit The credit limit for the user.
    /// @return isStale Whether the price is stale.
    /// @return isValid Whether the price is valid.
    function creditLimitSafe(
        address source,
        address user
    ) external view returns (uint256 limit, bool isStale, bool isValid) {
        uint256 total;
        (total, isStale, isValid) = riskAdjustedValue(source, user, true);
        limit = CreditRiskMath.creditLimit(total, creditUtilizationCapWad);
    }

    /// @notice Calculates the total risk-adjusted value of collateral for a specific user.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @param shouldUseSafe Whether to use the safe price that does not revert.
    /// @return total The total risk-adjusted value of the collateral.
    /// @return isStale Whether the price is stale.
    /// @return isValid Whether the price is valid.
    function riskAdjustedValue(
        address source,
        address user,
        bool shouldUseSafe
    ) public view returns (uint256 total, bool isStale, bool isValid) {
        CredditAssetRegistry.AssetConfig[] memory configs = registry.listAssets(
            true
        );
        (total, isStale, isValid) = _sumAssetValue(
            source,
            user,
            configs,
            shouldUseSafe
        );
    }

    /// @notice Checks if a user is liquidatable.
    /// @dev Use this function to check if a user is liquidatable in your smart contracts strictly.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @param debt The amount of debt.
    /// @return liquidatable Whether the user is liquidatable.
    function isLiquidatable(
        address source,
        address user,
        uint256 debt
    ) external view returns (bool) {
        if (debt == 0) return false;
        (uint256 value, , ) = liquidationValue(source, user, false);
        return CreditRiskMath.isLiquidatable(value, debt);
    }

    /// @notice Checks if a user is liquidatable.
    /// @dev The safe version does not revert for oracle price staleness and validity.
    /// @dev Use this function to check if a user is liquidatable in dapps only.
    /// @dev Do not use this function to check if a user is liquidatable in your smart contracts; use isLiquidatable() instead.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @param debt The amount of debt.
    /// @return liquidatable Whether the user is liquidatable.
    function isLiquidatableSafe(
        address source,
        address user,
        uint256 debt
    ) external view returns (bool) {
        if (debt == 0) return false;
        (uint256 value, , ) = liquidationValue(source, user, true);
        return CreditRiskMath.isLiquidatable(value, debt);
    }

    /// @notice Calculates the liquidation value of a collateral source for a specific user.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @param shouldUseSafe Whether to use the safe price that does not revert.
    /// @return total The liquidation value of the collateral source for the user.
    /// @return isStale Whether the price is stale.
    /// @return isValid Whether the price is valid.
    function liquidationValue(
        address source,
        address user,
        bool shouldUseSafe
    ) public view returns (uint256 total, bool isStale, bool isValid) {
        CredditAssetRegistry.AssetConfig[] memory configs = registry.listAssets(
            false
        );
        (total, isStale, isValid) = _sumAssetValue(
            source,
            user,
            configs,
            shouldUseSafe
        );
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/
    /// @notice Sums the value of the assets for a specific user.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @param configs The asset configurations.
    /// @return total The total value of the assets.
    function _sumAssetValue(
        address source,
        address user,
        CredditAssetRegistry.AssetConfig[] memory configs,
        bool shouldUseSafe
    ) internal view returns (uint256 total, bool isStale, bool isValid) {
        for (uint256 i; i < configs.length; ++i) {
            CredditAssetRegistry.AssetConfig memory cfg = configs[i];
            uint256 collateral = ICollateralSource(source).collateralOf(
                user,
                cfg.token
            );
            uint256 value;
            (value, isStale, isValid) = _assetValue(
                collateral,
                cfg.token,
                cfg,
                shouldUseSafe
            );
            total += CreditRiskMath.riskAdjustedValue(
                value,
                uint256(cfg.collateralFactorBps).bpsToWad()
            );
        }
    }

    /// @dev Calculates the risk-adjusted value of collateral for a specific asset.
    /// @param collateral The amount of collateral held.
    /// @param asset The asset token address
    /// @param assetCfg The asset configuration.
    /// @param shouldUseSafe Whether to use the safe price that does not revert.
    /// @return value The risk-adjusted value of the collateral.
    /// @return isStale Whether the price is stale.
    /// @return isValid Whether the price is valid.
    function _assetValue(
        uint256 collateral,
        address asset,
        CredditAssetRegistry.AssetConfig memory assetCfg,
        bool shouldUseSafe
    ) internal view returns (uint256 value, bool isStale, bool isValid) {
        if (collateral == 0) return (0, false, false);
        uint256 priceWad;
        if (shouldUseSafe) {
            (priceWad, isStale, isValid) = oracle.getUsdPriceSafe(asset);
        } else {
            priceWad = oracle.getUsdPrice(asset);
            isStale = false;
            isValid = true;
        }

        uint256 collateralWad = collateral.toWad(assetCfg.decimals);
        value = collateralWad.wadMulDown(priceWad);
    }
}
