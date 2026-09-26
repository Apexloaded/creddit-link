// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IPriceOracle
/// @notice Standardized price interface consumed by the risk engine. All
/// implementations must return a WAD (1e18)-scaled USD price and MUST revert
/// rather than return a stale, zero, or negative price.
interface IPriceOracle {
    /// @notice Returns the latest validated USD price for `asset`, scaled to 1e18.
    /// @dev MUST revert on: stale round, incomplete round, zero price, negative price.
    /// @dev The returned price already reflects any Stock Token corporate-action
    /// multiplier baked into the upstream feed — callers must NOT re-apply a
    /// separate UI multiplier on top of this price (see CredditOracle.sol).
    function getUsdPrice(
        address asset
    ) external view returns (uint256 priceWad);

    function getUsdPriceSafe(
        address asset
    ) external view returns (uint256 priceWad, bool isStale, bool isValid);
}
