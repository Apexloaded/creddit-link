// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice Minimal, standard Chainlink AggregatorV3Interface ABI, vendored
/// locally to avoid a full Chainlink contracts package dependency for a
/// single interface. Matches the canonical interface exactly.
interface AggregatorV3Interface {
    /// @notice Returns the number of decimals in the price.
    /// @return The number of decimals.
    function decimals() external view returns (uint8);

    /// @notice Returns the description of the price feed.
    /// @return The description of the price feed.
    function description() external view returns (string memory);

    /// @notice Returns the version of the price feed.
    /// @return The version of the price feed.
    function version() external view returns (uint256);

    /// @notice Returns the latest round data for the price feed.
    /// @return roundId The ID of the round.
    /// @return answer The price in the feed's currency.
    /// @return startedAt The timestamp when the round started.
    /// @return updatedAt The timestamp when the round was updated.
    /// @return answeredInRound The ID of the round that was answered.
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
