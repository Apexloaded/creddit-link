// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title ICollateralSource
/// @notice Interface for the collateral source contract.
interface ICollateralSource {
    /// @notice Returns the amount of collateral for a specific user and asset.
    /// @param user The address of the user.
    /// @param asset The address of the asset.
    /// @return The amount of collateral.
    function collateralOf(
        address user,
        address asset
    ) external view returns (uint256);
}
