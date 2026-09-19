// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "./CredditErrors.sol";

/// @title CredditCore
/// @notice Abstract base contains shared storage and access control.
abstract contract CredditCore is AccessControl {
    /// @notice Role used to protect asset configuration.
    bytes32 public constant ASSET_ADMIN_ROLE = keccak256("ASSET_ADMIN_ROLE");

    /// @notice Emitted when the system is paused.
    /// @param pauser The address that performed the action.
    /// @param timestamp The time of the action.
    event SystemPaused(address indexed pauser, uint256 timestamp);

    /// @notice Emitted when the system is unpaused.
    /// @param unpauser The address that performed the action.
    /// @param timestamp The time of the action.
    event SystemUnpaused(address indexed unpauser, uint256 timestamp);

    constructor(address defaultAdmin) {
        if (defaultAdmin == address(0)) revert ZeroAddressProvided();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }
}
