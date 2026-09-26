// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title CredditRoles
/// @notice Central registry of all role identifiers used across the protocol.
library CredditRoles {
    /// @notice Role used to protect asset configuration.
    bytes32 public constant ASSET_ADMIN_ROLE = keccak256("ASSET_ADMIN_ROLE");

    /// @notice Role used to pause the system.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role used to update risk parameters.
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");

    /// @notice Role used to update adapter configurations.
    bytes32 public constant ADAPTER_ADMIN_ROLE =
        keccak256("ADAPTER_ADMIN_ROLE");

    /// @notice Role used by CredditCreditLine to call other contracts
    bytes32 public constant CREDIT_LINE_ROLE = keccak256("CREDIT_LINE_ROLE");

    /// @notice Role used by CredditRouter to call other contracts
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    /// @notice Role used to protect liquidity pool configuration
    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN_ROLE");

    /// @notice Role used to protect treasury configuration
    bytes32 public constant TREASURY_ADMIN_ROLE =
        keccak256("TREASURY_ADMIN_ROLE");
}
