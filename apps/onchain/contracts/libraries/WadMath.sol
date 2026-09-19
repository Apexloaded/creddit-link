// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title WadMath
/// @notice Fixed-point helpers for 1e18-scaled ("WAD") financial math used across
/// the protocol. Every function makes its rounding direction explicit in its name
/// because rounding direction determines which side (protocol vs. user) absorbs
/// dust — see individual call sites for why a given direction is conservative.
library WadMath {
    uint256 public constant WAD = 1e18;
    uint256 public constant MAX_BPS = 10_000;
}
