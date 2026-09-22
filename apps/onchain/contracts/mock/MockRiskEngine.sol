// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice Test-only mock of the risk engine
/// @dev Mirrors the public interface of CredditRiskEngine for use in the test suite.
/// @dev It is not intended for use in production.
contract MockRiskEngine {
    // ---------------------------------------------------------------------------
    // Public state — matches CredditRiskEngine storage layout
    // ---------------------------------------------------------------------------

    /// @notice WAD fraction of risk-adjusted collateral value a user may borrow
    /// against, e.g. 0.90e18 = 90%.
    uint256 public creditUtilizationCapWad = 0.90e18;

    /// @notice Max distinct collateral assets a single user may hold.
    uint256 public maxCollateralAssetsPerUser = 5;

    /// @notice Max fraction of a position's debt that can be repaid in a single
    /// liquidation call, WAD fraction.
    uint256 public liquidationCloseFactorWad = 0.50e18; // 50%

    // ---------------------------------------------------------------------------
    // Internal mock state — controlled by test helpers
    // ---------------------------------------------------------------------------

    mapping(address => uint256) public mockCreditLimits;
    mapping(address => bool) public mockLiquidatable;
    mapping(address => uint256) public mockRiskAdjustedValues;
    mapping(address => uint256) public mockLiquidationValues;

    // ---------------------------------------------------------------------------
    // Test helpers — setters for mock state
    // ---------------------------------------------------------------------------

    function setCreditUtilizationCap(uint256 capWad) external {
        creditUtilizationCapWad = capWad;
    }

    function setMaxCollateralAssetsPerUser(uint256 max) external {
        maxCollateralAssetsPerUser = max;
    }

    function setLiquidationCloseFactor(uint256 closeFactorWad) external {
        liquidationCloseFactorWad = closeFactorWad;
    }

    function setCreditLimit(address user, uint256 limitWad) external {
        mockCreditLimits[user] = limitWad;
    }

    function setIsLiquidatable(address user, bool status) external {
        mockLiquidatable[user] = status;
    }

    function setRiskAdjustedValue(address user, uint256 val) external {
        mockRiskAdjustedValues[user] = val;
    }

    function setLiquidationValue(address user, uint256 val) external {
        mockLiquidationValues[user] = val;
    }

    // ---------------------------------------------------------------------------
    // Interface — mirrors CredditRiskEngine public view functions
    // ---------------------------------------------------------------------------

    /// @notice Returns the pre-configured credit limit for a user.
    /// @param source Unused in mock — present to match CredditRiskEngine signature.
    /// @param user The user whose credit limit is queried.
    function creditLimit(
        address source,
        address user
    ) external view returns (uint256) {
        source; // silence unused-var warning
        return mockCreditLimits[user];
    }

    /// @notice Returns the pre-configured risk-adjusted collateral value for a user.
    /// @param source Unused in mock — present to match CredditRiskEngine signature.
    /// @param user The user whose risk-adjusted value is queried.
    function riskAdjustedValue(
        address source,
        address user
    ) external view returns (uint256) {
        source; // silence unused-var warning
        return mockRiskAdjustedValues[user];
    }

    /// @notice Returns the pre-configured liquidation value for a user.
    /// @param source Unused in mock — present to match CredditRiskEngine signature.
    /// @param user The user whose liquidation value is queried.
    function liquidationValue(
        address source,
        address user
    ) external view returns (uint256) {
        source; // silence unused-var warning
        return mockLiquidationValues[user];
    }

    /// @notice Returns the pre-configured liquidatability flag for a user.
    /// @param source Unused in mock — present to match CredditRiskEngine signature.
    /// @param user The user being evaluated.
    /// @param debt Unused in mock — present to match CredditRiskEngine signature.
    function isLiquidatable(
        address source,
        address user,
        uint256 debt
    ) external view returns (bool) {
        source; // silence unused-var warning
        debt; // silence unused-var warning
        return mockLiquidatable[user];
    }
}
