// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CredditCore} from "./CredditCore.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";

/// @title CredditRiskEngine
/// @notice The CredditLink protocol risk engine contract.
/// @dev It is responsible for all risk calculations and risk management operations.
contract CredditRiskEngine is CredditCore {
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
    /// @param _creditUtilizationCapWad The WAD fraction of risk-adjusted collateral value a user may borrow against, e.g. 0.90e18 = 90%.
    /// @param _maxCollateralAssetsPerUser The max distinct collateral assets a single user may hold, bounding gas for portfolio iteration.
    /// @param _liquidationCloseFactorWad The max fraction of a position's debt that can be repaid in a single liquidation call, WAD fraction.
    /// @dev These roles allow the admin to add, update, or remove assets from the registry.
    function initialize(
        address admin,
        uint256 _creditUtilizationCapWad,
        uint256 _maxCollateralAssetsPerUser,
        uint256 _liquidationCloseFactorWad
    ) external initializer {
        if (admin == address(0)) revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant RISK_ADMIN_ROLE to the admin
        _grantRole(CredditRoles.RISK_ADMIN_ROLE, admin);

        // Initialize risk parameters
        creditUtilizationCapWad = _creditUtilizationCapWad;
        maxCollateralAssetsPerUser = _maxCollateralAssetsPerUser;
        liquidationCloseFactorWad = _liquidationCloseFactorWad;
    }
}
