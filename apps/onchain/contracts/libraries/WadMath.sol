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

    /// @dev x * y / WAD, rounded down. Use when rounding down favors the protocol
    /// (e.g. computing collateral value that will be compared against a debt ceiling).
    function wadMulDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return Math.mulDiv(x, y, WAD, Math.Rounding.Floor);
    }

    /// @dev x * y / WAD, rounded up. Use when rounding up favors the protocol
    /// (e.g. computing a debt amount owed by a user).
    function wadMulUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return Math.mulDiv(x, y, WAD, Math.Rounding.Ceil);
    }

    /// @dev x * WAD / y, rounded down.
    function wadDivDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return Math.mulDiv(x, WAD, y, Math.Rounding.Floor);
    }

    /// @dev x * WAD / y, rounded up.
    function wadDivUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return Math.mulDiv(x, WAD, y, Math.Rounding.Ceil);
    }

    /// @dev Converts a basis-points value (0-10000+) to a WAD fraction.
    function bpsToWad(uint256 bps) internal pure returns (uint256) {
        return (bps * WAD) / MAX_BPS;
    }

    /// @dev Scales `amount` (given in `fromDecimals`) to WAD (18 decimals),
    /// rounded down. Reverts implicitly via Solidity checked math on exotic inputs.
    function toWad(
        uint256 amount,
        uint8 fromDecimals
    ) internal pure returns (uint256) {
        if (fromDecimals == 18) return amount;
        if (fromDecimals < 18) return amount * (10 ** (18 - fromDecimals));
        return amount / (10 ** (fromDecimals - 18));
    }

    /// @dev Scales a WAD (18 decimal) amount down to `toDecimals`, rounded down.
    function fromWadDown(
        uint256 amount,
        uint8 toDecimals
    ) internal pure returns (uint256) {
        if (toDecimals == 18) return amount;
        if (toDecimals < 18) return amount / (10 ** (18 - toDecimals));
        return amount * (10 ** (toDecimals - 18));
    }

    /// @dev Scales a WAD (18 decimal) amount down to `toDecimals`, rounded up.
    function fromWadUp(
        uint256 amount,
        uint8 toDecimals
    ) internal pure returns (uint256) {
        if (toDecimals == 18) return amount;
        if (toDecimals < 18) {
            uint256 divisor = 10 ** (18 - toDecimals);
            return Math.ceilDiv(amount, divisor);
        }
        return amount * (10 ** (toDecimals - 18));
    }
}
