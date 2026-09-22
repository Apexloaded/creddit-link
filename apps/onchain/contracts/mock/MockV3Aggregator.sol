// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @notice Test-only mock Chainlink aggregator. Lets tests set price, staleness,
/// and incomplete-round conditions explicitly. Never used in production.
contract MockV3Aggregator is AggregatorV3Interface {
    uint8 private _decimals;
    int256 private _answer;
    uint256 private _startedAt;
    uint256 private _updatedAt;
    uint80 private _roundId = 1;
    uint80 private _answeredInRound = 1;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _answer = initialAnswer;
        _startedAt = block.timestamp;
        _updatedAt = block.timestamp;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "MockV3Aggregator";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function setAnswer(int256 newAnswer) external {
        _answer = newAnswer;
        _roundId += 1;
        _answeredInRound = _roundId;
        _startedAt = block.timestamp;
        _updatedAt = block.timestamp;
    }

    function setUpdatedAt(uint256 updatedAt_) external {
        _updatedAt = updatedAt_;
    }

    function setIncompleteRound() external {
        _answeredInRound = 0;
        _roundId = 5;
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
