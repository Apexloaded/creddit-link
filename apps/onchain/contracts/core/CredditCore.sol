// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CredditErrors.sol";

/// @title CredditCore
/// @notice Abstract base contains shared storage and access control.
abstract contract CredditCore is
    Initializable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable
{
    /// @notice Role used to protect asset configuration.
    bytes32 public constant ASSET_ADMIN_ROLE = keccak256("ASSET_ADMIN_ROLE");

    /// @notice Role used to pause the system.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role used to update risk parameters.
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");

    /// @notice Emitted when the system is paused.
    /// @param pauser The address that performed the action.
    /// @param timestamp The time of the action.
    event SystemPaused(address indexed pauser, uint256 timestamp);

    /// @notice Emitted when the system is unpaused.
    /// @param unpauser The address that performed the action.
    /// @param timestamp The time of the action.
    event SystemUnpaused(address indexed unpauser, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract.
    /// @param defaultAdmin The address of the admin.
    /// @dev This function should be called by the initializer of the derived contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    function __CredditCore_init(
        address defaultAdmin
    ) internal onlyInitializing {
        if (defaultAdmin == address(0)) revert ZeroAddressProvided();
        __Ownable_init(defaultAdmin);
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /// @dev Required by UUPSUpgradeable to authorize contract upgrades.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
