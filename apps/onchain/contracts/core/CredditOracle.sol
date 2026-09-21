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
/// @notice The CredditLink protocol oracle contract.
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

    /// @inheritdoc IPriceOracle
    function getUsdPrice(
        address asset
    ) external view override returns (uint256 priceWad) {
        FeedConfig memory cfg = feeds[asset];
        if (cfg.feed == address(0)) revert FeedNotConfigured();
        if (!cfg.enabled) revert FeedDisabled(asset);

        AggregatorV3Interface feed = AggregatorV3Interface(cfg.feed);
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        // Round completeness: answeredInRound must not precede roundId, and
        // updatedAt must be nonzero (a zero timestamp indicates an incomplete round).
        if (answeredInRound < roundId || updatedAt == 0)
            revert IncompleteRound(asset);

        // Staleness.
        if (block.timestamp - updatedAt > cfg.stalenessThreshold) {
            revert StalePrice(asset, updatedAt, cfg.stalenessThreshold);
        }

        // Reject non-positive prices explicitly (covers zero and negative).
        if (answer <= 0) revert InvalidPrice(asset, answer);

        uint8 feedDecimals = feed.decimals();
        // NOTE ON STOCK TOKEN MULTIPLIERS: the Chainlink feed for a
        // Robinhood Stock Token is expected to already reflect any corporate-action
        // multiplier applied to that token. This function performs ONLY a decimal
        // normalization to WAD — it must never apply an additional UI-level
        // multiplier on top of `answer`, or collateral would be double-counted.
        priceWad = uint256(answer).toWad(feedDecimals);
    }
}
