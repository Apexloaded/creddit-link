// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice Global Custom Errors for the Credit Protocol
error ZeroAmount();
error AssetNotEnabled(address token);
error UnauthorizedCaller(address caller, bytes32 requiredRole);
error ZeroAddressProvided();
error InsufficientCollateral(uint256 provided, uint256 required);
error InvalidDecimals(uint8 decimals);
error ArrayLengthMismatch();
