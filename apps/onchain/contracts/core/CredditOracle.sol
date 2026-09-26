// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CredditCore} from "./CredditCore.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @notice Custom errors for the CredditOracle contract
error InvalidPrice(address asset, int256 price);
error InvalidStalenessThreshold();
error FeedNotConfigured();
error FeedDisabled(address asset);
error IncompleteRound(address asset);
error StalePrice(address asset, uint256 updatedAt, uint256 stalenessThreshold);

/// @title CredditOracle
/// @notice Hardened Chainlink-compatible price oracle. Feed <-> asset mappings
/// may ONLY be set by the asset registry (via ASSET_ADMIN_ROLE) — users can
/// never supply an arbitrary oracle address for an asset.
contract CredditOracle is CredditCore, IPriceOracle {
    using WadMath for uint256;

    /// @dev Safety bounds for staleness threshold
    uint256 public constant MIN_STALENESS_THRESHOLD = 1 minutes;
    uint256 public constant MAX_STALENESS_THRESHOLD = 24 hours;

    /// @notice Struct for storing feed information.
    struct FeedConfig {
        /// @notice The address of the asset.
        address asset;
        /// @notice The staleness threshold in seconds.
        uint256 stalenessThreshold; // seconds
        /// @notice Whether the feed is enabled.
        bool enabled; // WAD (1e18)-scaled USD price
        /// @notice The address of the feed.
        address feed;
    }

    /// @notice Emitted when a new feed is configured.
    /// @param asset The address of the asset.
    /// @param feed The address of the feed.
    /// @param stalenessThreshold The staleness threshold in seconds.
    event FeedConfigured(
        address indexed asset,
        address indexed feed,
        uint256 stalenessThreshold
    );

    /// @notice Emitted when an asset status is changed.
    /// @param asset The address of the asset.
    /// @param enabled The status of the asset.
    event AssetStatusChanged(address indexed asset, bool enabled);

    /// @notice Asset address => FeedConfig mapping
    mapping(address => FeedConfig) public feeds;

    /// @notice Initializes the CredditOracle contract.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    function initialize(address admin) external initializer {
        if (admin == address(0)) revert ZeroAddressProvided();
        __CredditCore_init(admin);
        _grantRole(CredditRoles.ASSET_ADMIN_ROLE, admin);
    }

    /// @notice Sets the feed configuration for an asset.
    /// @param feed The address of the feed.
    /// @param asset The address of the asset.
    /// @param stalenessThreshold The staleness threshold in seconds.
    /// @dev Only callable by the ASSET_ADMIN_ROLE.
    /// @dev Reverts if the asset or feed address is zero.
    /// @dev Reverts if the staleness threshold is outside the allowed range.
    /// @dev Reverts if the contract is paused.
    function setFeed(
        address feed,
        address asset,
        uint256 stalenessThreshold
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) whenNotPaused {
        if (asset == address(0) || feed == address(0))
            revert ZeroAddressProvided();

        if (
            stalenessThreshold < MIN_STALENESS_THRESHOLD ||
            stalenessThreshold > MAX_STALENESS_THRESHOLD
        ) revert InvalidStalenessThreshold();

        feeds[asset] = FeedConfig(asset, stalenessThreshold, true, feed);
        emit FeedConfigured(asset, feed, stalenessThreshold);
    }

    /// @notice Sets the enabled status of an asset.
    /// @param asset The address of the asset.
    /// @param enabled The status of the asset.
    /// @dev Only callable by the ASSET_ADMIN_ROLE.
    /// @dev Reverts if the asset address is zero.
    /// @dev Reverts if the contract is paused.
    function setAssetEnabled(
        address asset,
        bool enabled
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) whenNotPaused {
        if (asset == address(0)) revert ZeroAddressProvided();
        feeds[asset].enabled = enabled;
        emit AssetStatusChanged(asset, enabled);
    }

    /// @notice Sets the staleness threshold for an asset.
    /// @param asset The address of the asset.
    /// @param stalenessThreshold The staleness threshold in seconds.
    /// @dev Only callable by the ASSET_ADMIN_ROLE.
    /// @dev Reverts if the asset address is zero.
    /// @dev Reverts if the staleness threshold is outside the allowed range.
    /// @dev Reverts if the contract is paused.
    function setStalenessThreshold(
        address asset,
        uint256 stalenessThreshold
    ) external onlyRole(CredditRoles.ASSET_ADMIN_ROLE) whenNotPaused {
        if (asset == address(0)) revert ZeroAddressProvided();
        if (
            stalenessThreshold < MIN_STALENESS_THRESHOLD ||
            stalenessThreshold > MAX_STALENESS_THRESHOLD
        ) revert InvalidStalenessThreshold();

        feeds[asset].stalenessThreshold = stalenessThreshold;
        emit FeedConfigured(asset, feeds[asset].feed, stalenessThreshold);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Gets the feed configuration for an asset.
    /// @param asset The address of the asset.
    /// @return The feed configuration for the asset.
    function getFeed(address asset) external view returns (FeedConfig memory) {
        if (asset == address(0)) revert ZeroAddressProvided();
        return feeds[asset];
    }

    /// @notice Strict pricing function used by state-changing functions (Credit Line, Liquidations)
    /// @dev Reverts on stale prices, incomplete rounds, or non-positive values.
    /// @param asset The address of the asset.
    /// @return priceWad The WAD-normalized USD price of the asset.
    function getUsdPrice(
        address asset
    ) external view override returns (uint256 priceWad) {
        (
            uint256 price,
            bool isStale,
            bool isValid,
            uint256 updatedAt
        ) = _getPriceInternal(asset);

        if (!isValid) revert IncompleteRound(asset);

        if (isStale) {
            FeedConfig memory cfg = feeds[asset];
            revert StalePrice(asset, updatedAt, cfg.stalenessThreshold);
        }

        return price;
    }

    /// @notice Flexible pricing function for UI / external read-only calls
    /// @dev This function does not revert on stale prices. It returns the last known price and a flag indicating whether it is stale.
    /// @param asset The address of the asset.
    /// @return priceWad The price normalized to WAD
    /// @return isStale True if the price exceeds the staleness threshold
    function getUsdPriceSafe(
        address asset
    ) external view returns (uint256 priceWad, bool isStale, bool isValid) {
        (priceWad, isStale, isValid, ) = _getPriceInternal(asset);
        // If the round is incomplete or invalid, treat it as stale/unusable for the UI
        if (!isValid) {
            return (0, true, isValid);
        }
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/
    function _getPriceInternal(
        address asset
    )
        internal
        view
        returns (
            uint256 priceWad,
            bool isStale,
            bool isValid,
            uint256 updatedAt
        )
    {
        FeedConfig memory cfg = feeds[asset];
        if (cfg.feed == address(0)) revert FeedNotConfigured();
        if (!cfg.enabled) revert FeedDisabled(asset);

        AggregatorV3Interface feed = AggregatorV3Interface(cfg.feed);
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 feedUpdatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        updatedAt = feedUpdatedAt;

        // Soft check: If round is incomplete or price is invalid, mark isValid = false without reverting
        if (answeredInRound < roundId || updatedAt == 0 || answer <= 0) {
            return (0, true, false, updatedAt);
        }

        isStale = block.timestamp - updatedAt > cfg.stalenessThreshold;
        isValid = true;
        priceWad = uint256(answer).toWad(feed.decimals());
    }
}
