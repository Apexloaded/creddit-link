// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CredditCore} from "./CredditCore.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";
import {CredditAssetRegistry} from "./CredditAssetRegistry.sol";
import {ICollateralSource} from "../interfaces/ICollateralSource.sol";

/// @title CredditRiskEngine
/// @notice The CredditLink protocol risk engine contract.
/// @dev It is responsible for all risk calculations and risk management operations.
contract CredditRiskEngine is CredditCore {
    /// @dev Reference to the asset registry contract.
    CredditAssetRegistry public registry;

    /// @notice WAD fraction of risk-adjusted collateral value a user may borrow
    /// against, e.g. 0.90e18 = 90%.
    uint256 public creditUtilizationCapWad;
    /// @notice Max distinct collateral assets a single user may hold, bounding
    /// gas for portfolio iteration.
    uint256 public maxCollateralAssetsPerUser;
    /// @notice Max fraction of a position's debt that can be repaid in a single
    /// liquidation call, WAD fraction.
    uint256 public liquidationCloseFactorWad;

    /// @notice Initialized only once when the contract is deployed.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param _assetRegistry The address of the asset registry contract.
    /// @param _creditUtilizationCapWad The WAD fraction of risk-adjusted collateral value a user may borrow against, e.g. 0.90e18 = 90%.
    /// @param _maxCollateralAssetsPerUser The max distinct collateral assets a single user may hold, bounding gas for portfolio iteration.
    /// @param _liquidationCloseFactorWad The max fraction of a position's debt that can be repaid in a single liquidation call, WAD fraction.
    function initialize(
        address admin,
        address _assetRegistry,
        uint256 _creditUtilizationCapWad,
        uint256 _maxCollateralAssetsPerUser,
        uint256 _liquidationCloseFactorWad
    ) external initializer {
        if (admin == address(0)) revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant RISK_ADMIN_ROLE to the admin
        _grantRole(CredditRoles.RISK_ADMIN_ROLE, admin);

        // Initialize Asset Registry and USDG
        registry = CredditAssetRegistry(_assetRegistry);

        // Initialize risk parameters
        creditUtilizationCapWad = _creditUtilizationCapWad;
        maxCollateralAssetsPerUser = _maxCollateralAssetsPerUser;
        liquidationCloseFactorWad = _liquidationCloseFactorWad;
    }

    /// @dev Calculates the credit limit for a specific user and collateral source.
    /// @param source The collateral source contract.
    /// @param user The address of the user.
    /// @return The credit limit for the user.
    function creditLimit(
        address source,
        address user
    ) public view returns (uint256) {}

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/

    /// @dev Calculates the risk-adjusted value of collateral for a specific asset.
    /// @param collateral The amount of collateral held.
    /// @param asset The asset configuration.
    /// @return The risk-adjusted value of the collateral.
    function _assetValue(
        uint256 collateral,
        address asset,
        CredditAssetRegistry.AssetConfig memory assetCfg
    ) internal pure returns (uint256) {}
}
