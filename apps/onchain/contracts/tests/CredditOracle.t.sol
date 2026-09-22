// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CredditOracle, InvalidPrice, InvalidStalenessThreshold, FeedNotConfigured, FeedDisabled, IncompleteRound, StalePrice} from "../core/CredditOracle.sol";
import {ZeroAddressProvided} from "../core/CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @notice Mock Chainlink Aggregator V3 Feed
contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 public override decimals;
    string public override description = "Mock Chainlink Feed";
    uint256 public override version = 1;

    uint80 private _roundId;
    int256 private _answer;
    uint256 private _startedAt;
    uint256 private _updatedAt;
    uint80 private _answeredInRound;

    constructor(uint8 _decimals) {
        decimals = _decimals;
    }

    function setRoundData(
        uint80 roundId_,
        int256 answer_,
        uint256 startedAt_,
        uint256 updatedAt_,
        uint80 answeredInRound_
    ) external {
        _roundId = roundId_;
        _answer = answer_;
        _startedAt = startedAt_;
        _updatedAt = updatedAt_;
        _answeredInRound = answeredInRound_;
    }

    function getRoundData(
        uint80 _requestedRoundId
    )
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _requestedRoundId,
            _answer,
            _startedAt,
            _updatedAt,
            _answeredInRound
        );
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
    }
}

contract CredditOracleTest is Test {
    CredditOracle public oracle;
    CredditOracle public oracleImpl;

    MockAggregatorV3 public feed8Decimals;
    MockAggregatorV3 public feed18Decimals;

    address public admin = address(0x111);
    address public alice = address(0x222);

    address public mockAssetA = address(0xA1);
    address public mockAssetB = address(0xB2);

    uint256 public constant DEFAULT_STALENESS_THRESHOLD = 1 hours;

    event FeedConfigured(
        address indexed asset,
        address indexed feed,
        uint256 stalenessThreshold
    );
    event AssetStatusChanged(address indexed asset, bool enabled);

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy Mocks
        feed8Decimals = new MockAggregatorV3(8); // Standard BTC/USD or ETH/USD feed
        feed18Decimals = new MockAggregatorV3(18); // 18-decimal feed

        // Set default valid price ($2000 in 8-decimal precision = 2000 * 1e8)
        feed8Decimals.setRoundData(
            1,
            2000_00000000,
            block.timestamp,
            block.timestamp,
            1
        );
        feed18Decimals.setRoundData(
            1,
            2000e18,
            block.timestamp,
            block.timestamp,
            1
        );

        // 2. Deploy CredditOracle via deployCode to optimize bytecode size
        address implAddr = deployCode("CredditOracle.sol:CredditOracle");
        oracleImpl = CredditOracle(implAddr);

        bytes memory initData = abi.encodeCall(
            CredditOracle.initialize,
            (admin)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(oracleImpl), initData);
        oracle = CredditOracle(address(proxy));

        vm.stopPrank();
    }

    /* =========================================================================
     * INITIALIZATION TESTS
     * ========================================================================= */

    function test_Initialize_Success() public view {
        assertTrue(oracle.hasRole(CredditRoles.ASSET_ADMIN_ROLE, admin));
        assertTrue(oracle.hasRole(oracle.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Initialize_RevertIf_ZeroAddressAdmin() public {
        address implAddr = deployCode("CredditOracle.sol:CredditOracle");
        CredditOracle impl = CredditOracle(implAddr);
        bytes memory initData = abi.encodeCall(
            CredditOracle.initialize,
            (address(0))
        );

        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), initData);
    }

    function test_Initialize_RevertIf_Reinitialized() public {
        vm.expectRevert();
        oracle.initialize(admin);
    }

    /* =========================================================================
     * ADMIN CONFIGURATION TESTS
     * ========================================================================= */

    function test_SetFeed_Success() public {
        vm.startPrank(admin);

        vm.expectEmit(true, true, false, true);
        emit FeedConfigured(
            mockAssetA,
            address(feed8Decimals),
            DEFAULT_STALENESS_THRESHOLD
        );

        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );
        vm.stopPrank();

        CredditOracle.FeedConfig memory cfg = oracle.getFeed(mockAssetA);
        assertEq(cfg.asset, mockAssetA);
        assertEq(cfg.feed, address(feed8Decimals));
        assertEq(cfg.stalenessThreshold, DEFAULT_STALENESS_THRESHOLD);
        assertTrue(cfg.enabled);
    }

    function test_SetFeed_RevertIf_NotAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );
    }

    function test_SetFeed_RevertIf_ZeroAddress() public {
        vm.startPrank(admin);

        // Zero Asset
        vm.expectRevert(ZeroAddressProvided.selector);
        oracle.setFeed(
            address(feed8Decimals),
            address(0),
            DEFAULT_STALENESS_THRESHOLD
        );

        // Zero Feed
        vm.expectRevert(ZeroAddressProvided.selector);
        oracle.setFeed(address(0), mockAssetA, DEFAULT_STALENESS_THRESHOLD);

        vm.stopPrank();
    }

    function test_SetFeed_RevertIf_InvalidStalenessThreshold() public {
        vm.startPrank(admin);

        // Below MIN_STALENESS_THRESHOLD (1 min = 60s)
        vm.expectRevert(InvalidStalenessThreshold.selector);
        oracle.setFeed(address(feed8Decimals), mockAssetA, 59 seconds);

        // Above MAX_STALENESS_THRESHOLD (24 hrs = 86400s)
        vm.expectRevert(InvalidStalenessThreshold.selector);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            24 hours + 1 seconds
        );

        vm.stopPrank();
    }

    function test_SetAssetEnabled_Success() public {
        vm.startPrank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );

        vm.expectEmit(true, false, false, true);
        emit AssetStatusChanged(mockAssetA, false);

        oracle.setAssetEnabled(mockAssetA, false);
        assertFalse(oracle.getFeed(mockAssetA).enabled);

        vm.expectEmit(true, false, false, true);
        emit AssetStatusChanged(mockAssetA, true);

        oracle.setAssetEnabled(mockAssetA, true);
        assertTrue(oracle.getFeed(mockAssetA).enabled);

        vm.stopPrank();
    }

    function test_SetStalenessThreshold_Success() public {
        vm.startPrank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );

        uint256 newThreshold = 2 hours;
        vm.expectEmit(true, true, false, true);
        emit FeedConfigured(mockAssetA, address(feed8Decimals), newThreshold);

        oracle.setStalenessThreshold(mockAssetA, newThreshold);
        vm.stopPrank();

        assertEq(oracle.getFeed(mockAssetA).stalenessThreshold, newThreshold);
    }

    /* =========================================================================
     * PRICE ORACLE FETCHING & VALIDATION TESTS
     * ========================================================================= */

    function test_GetUsdPrice_Success_8Decimals() public {
        vm.prank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );

        // Feed price: $2000 in 8 decimals -> Should scale to $2000 WAD (2000e18)
        uint256 priceWad = oracle.getUsdPrice(mockAssetA);
        assertEq(priceWad, 2000e18);
    }

    function test_GetUsdPrice_Success_18Decimals() public {
        vm.prank(admin);
        oracle.setFeed(
            address(feed18Decimals),
            mockAssetB,
            DEFAULT_STALENESS_THRESHOLD
        );

        // Feed price: $2000 in 18 decimals -> Should return $2000 WAD (2000e18)
        uint256 priceWad = oracle.getUsdPrice(mockAssetB);
        assertEq(priceWad, 2000e18);
    }

    function test_GetUsdPrice_RevertIf_FeedNotConfigured() public {
        vm.expectRevert(FeedNotConfigured.selector);
        oracle.getUsdPrice(mockAssetA);
    }

    function test_GetUsdPrice_RevertIf_FeedDisabled() public {
        vm.startPrank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );
        oracle.setAssetEnabled(mockAssetA, false);
        vm.stopPrank();

        vm.expectRevert(
            abi.encodeWithSelector(FeedDisabled.selector, mockAssetA)
        );
        oracle.getUsdPrice(mockAssetA);
    }

    function test_GetUsdPrice_RevertIf_IncompleteRound() public {
        vm.startPrank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );
        vm.stopPrank();

        // Case 1: answeredInRound < roundId
        feed8Decimals.setRoundData(
            2,
            2000_00000000,
            block.timestamp,
            block.timestamp,
            1
        );
        vm.expectRevert(
            abi.encodeWithSelector(IncompleteRound.selector, mockAssetA)
        );
        oracle.getUsdPrice(mockAssetA);

        // Case 2: updatedAt == 0
        feed8Decimals.setRoundData(2, 2000_00000000, block.timestamp, 0, 2);
        vm.expectRevert(
            abi.encodeWithSelector(IncompleteRound.selector, mockAssetA)
        );
        oracle.getUsdPrice(mockAssetA);
    }

    function test_GetUsdPrice_RevertIf_StalePrice() public {
        vm.startPrank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );
        vm.stopPrank();

        uint256 updateTime = block.timestamp;
        feed8Decimals.setRoundData(1, 2000_00000000, updateTime, updateTime, 1);

        // Advance time beyond the 1-hour threshold
        vm.warp(block.timestamp + 1 hours + 1 seconds);

        vm.expectRevert(
            abi.encodeWithSelector(
                StalePrice.selector,
                mockAssetA,
                updateTime,
                DEFAULT_STALENESS_THRESHOLD
            )
        );
        oracle.getUsdPrice(mockAssetA);
    }

    function test_GetUsdPrice_RevertIf_InvalidPrice() public {
        vm.startPrank(admin);
        oracle.setFeed(
            address(feed8Decimals),
            mockAssetA,
            DEFAULT_STALENESS_THRESHOLD
        );
        vm.stopPrank();

        // Zero price
        feed8Decimals.setRoundData(1, 0, block.timestamp, block.timestamp, 1);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidPrice.selector, mockAssetA, 0)
        );
        oracle.getUsdPrice(mockAssetA);

        // Negative price
        feed8Decimals.setRoundData(
            1,
            -100,
            block.timestamp,
            block.timestamp,
            1
        );
        vm.expectRevert(
            abi.encodeWithSelector(InvalidPrice.selector, mockAssetA, -100)
        );
        oracle.getUsdPrice(mockAssetA);
    }
}
