// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {stdError} from "forge-std/StdError.sol";
import {WadMath} from "../libraries/WadMath.sol";

/* =========================================================================
 * TEST HARNESS FOR INTERNAL LIBRARY FUNCTIONS
 * ========================================================================= */

contract WadMathHarness {
    function wadMulDown(uint256 x, uint256 y) external pure returns (uint256) {
        return WadMath.wadMulDown(x, y);
    }

    function wadMulUp(uint256 x, uint256 y) external pure returns (uint256) {
        return WadMath.wadMulUp(x, y);
    }

    function wadDivDown(uint256 x, uint256 y) external pure returns (uint256) {
        return WadMath.wadDivDown(x, y);
    }

    function wadDivUp(uint256 x, uint256 y) external pure returns (uint256) {
        return WadMath.wadDivUp(x, y);
    }

    function bpsToWad(uint256 bps) external pure returns (uint256) {
        return WadMath.bpsToWad(bps);
    }

    function toWad(
        uint256 amount,
        uint8 fromDecimals
    ) external pure returns (uint256) {
        return WadMath.toWad(amount, fromDecimals);
    }

    function fromWadDown(
        uint256 amount,
        uint8 toDecimals
    ) external pure returns (uint256) {
        return WadMath.fromWadDown(amount, toDecimals);
    }

    function fromWadUp(
        uint256 amount,
        uint8 toDecimals
    ) external pure returns (uint256) {
        return WadMath.fromWadUp(amount, toDecimals);
    }
}

/* =========================================================================
 * TEST SUITE
 * ========================================================================= */

contract WadMathTest is Test {
    WadMathHarness public harness;

    uint256 public constant WAD = 1e18;

    function setUp() public {
        harness = new WadMathHarness();
    }

    /* =========================================================================
     * WAD MULTIPLICATION TESTS
     * ========================================================================= */

    function test_WadMulDown_Basic() public view {
        // 2 WAD * 3 WAD = 6 WAD
        assertEq(harness.wadMulDown(2e18, 3e18), 6e18);
        // 1.5 WAD * 2 WAD = 3 WAD
        assertEq(harness.wadMulDown(1.5e18, 2e18), 3e18);
        // Multiplication by zero
        assertEq(harness.wadMulDown(0, 5e18), 0);
    }

    function test_WadMulDown_RoundsDown() public view {
        // (1e18 - 1) * (1e18 - 1) / 1e18 = 0.999999999999999998... rounds down to 999999999999999998
        uint256 res = harness.wadMulDown(1e18 - 1, 1e18 - 1);
        assertEq(res, 1e18 - 2);

        // 1 * 1 / 1e18 = 0
        assertEq(harness.wadMulDown(1, 1), 0);
    }

    function test_WadMulUp_Basic() public view {
        assertEq(harness.wadMulUp(2e18, 3e18), 6e18);
        assertEq(harness.wadMulUp(1.5e18, 2e18), 3e18);
        assertEq(harness.wadMulUp(0, 5e18), 0);
    }

    function test_WadMulUp_RoundsUp() public view {
        // 1 * 1 / 1e18 = 0.000000000000000001 -> rounds up to 1
        assertEq(harness.wadMulUp(1, 1), 1);

        // (1e18 - 1) * 1 / 1e18 = 0.999999999999999999 -> rounds up to 1e18
        assertEq(harness.wadMulUp(1e18 - 1, 1), 1);
    }

    /* =========================================================================
     * WAD DIVISION TESTS
     * ========================================================================= */

    function test_WadDivDown_Basic() public view {
        // 6 WAD / 2 WAD = 3 WAD
        assertEq(harness.wadDivDown(6e18, 2e18), 3e18);
        // 1 WAD / 2 WAD = 0.5 WAD
        assertEq(harness.wadDivDown(1e18, 2e18), 0.5e18);
    }

    function test_WadDivDown_RoundsDown() public view {
        // 1 * 1e18 / 3 = 333,333,333,333,333,333
        assertEq(harness.wadDivDown(1, 3), 333_333_333_333_333_333);
    }

    function test_WadDivDown_RevertIf_DivisionByZero() public {
        vm.expectRevert(stdError.divisionError);
        harness.wadDivDown(1e18, 0);
    }

    function test_WadDivUp_RevertIf_DivisionByZero() public {
        vm.expectRevert(stdError.divisionError);
        harness.wadDivUp(1e18, 0);
    }

    function test_WadDivUp_Basic() public view {
        assertEq(harness.wadDivUp(6e18, 2e18), 3e18);
        assertEq(harness.wadDivUp(1e18, 2e18), 0.5e18);
    }

    function test_WadDivUp_RoundsUp() public view {
        // 1 * 1e18 / 3 = 333,333,333,333,333,333.333... -> rounds up to 333,333,333,333,333,334
        assertEq(harness.wadDivUp(1, 3), 333_333_333_333_333_334);
    }

    /* =========================================================================
     * BPS CONVERSION TESTS
     * ========================================================================= */

    function test_BpsToWad_Basic() public view {
        assertEq(harness.bpsToWad(10_000), 1e18); // 100% = 1 WAD
        assertEq(harness.bpsToWad(5_000), 0.5e18); // 50% = 0.5 WAD
        assertEq(harness.bpsToWad(100), 0.01e18); // 1% = 0.01 WAD
        assertEq(harness.bpsToWad(1), 0.0001e18); // 1 bps = 0.0001 WAD
        assertEq(harness.bpsToWad(0), 0);
    }

    /* =========================================================================
     * DECIMAL CONVERSION TESTS (toWad)
     * ========================================================================= */

    function test_ToWad_SameDecimals() public view {
        assertEq(harness.toWad(100e18, 18), 100e18);
    }

    function test_ToWad_LesserDecimals() public view {
        // USDC (6 decimals): 1,000 USDC (1,000e6) -> 1,000 WAD
        assertEq(harness.toWad(1_000e6, 6), 1_000e18);
        // WBTC (8 decimals): 1 WBTC (1e8) -> 1 WAD
        assertEq(harness.toWad(1e8, 8), 1e18);
    }

    function test_ToWad_GreaterDecimals() public view {
        // High-precision token (24 decimals)
        assertEq(harness.toWad(1e24, 24), 1e18);
        assertEq(harness.toWad(1e20, 20), 1e18);
        // Truncates extra decimals (rounds down)
        assertEq(harness.toWad(123456, 20), 1234);
    }

    /* =========================================================================
     * DECIMAL CONVERSION TESTS (fromWadDown / fromWadUp)
     * ========================================================================= */

    function test_FromWadDown_SameDecimals() public view {
        assertEq(harness.fromWadDown(100e18, 18), 100e18);
    }

    function test_FromWadDown_LesserDecimals() public view {
        // 1,000 WAD -> 1,000 USDC (6 decimals)
        assertEq(harness.fromWadDown(1_000e18, 6), 1_000e6);
        // Truncation check
        assertEq(harness.fromWadDown(1.999999999999999999e18, 6), 1.999999e6);
    }

    function test_FromWadDown_GreaterDecimals() public view {
        // 1 WAD -> 1e24 (24 decimals)
        assertEq(harness.fromWadDown(1e18, 24), 1e24);
    }

    function test_FromWadUp_SameDecimals() public view {
        assertEq(harness.fromWadUp(100e18, 18), 100e18);
    }

    function test_FromWadUp_LesserDecimals() public view {
        // Exact conversion
        assertEq(harness.fromWadUp(1_000e18, 6), 1_000e6);

        // 1 WAD + 1 wei -> should round up to 0.000002 USDC (6 decimals)
        assertEq(harness.fromWadUp(1e12 + 1, 6), 2);
    }

    function test_FromWadUp_GreaterDecimals() public view {
        assertEq(harness.fromWadUp(1e18, 24), 1e24);
    }

    /* =========================================================================
     * FUZZ TESTS
     * ========================================================================= */

    function testFuzz_WadMul_UpvsDown(uint256 x, uint256 y) public view {
        // Bound inputs to prevent overflow before WAD division
        x = bound(x, 0, type(uint128).max);
        y = bound(y, 0, type(uint128).max);

        uint256 down = harness.wadMulDown(x, y);
        uint256 up = harness.wadMulUp(x, y);

        assertTrue(up >= down);
        assertTrue(up - down <= 1);
    }

    function testFuzz_WadDiv_UpvsDown(uint256 x, uint256 y) public view {
        x = bound(x, 0, type(uint128).max);
        y = bound(y, 1, type(uint128).max); // y must be non-zero

        uint256 down = harness.wadDivDown(x, y);
        uint256 up = harness.wadDivUp(x, y);

        assertTrue(up >= down);
        assertTrue(up - down <= 1);
    }

    function testFuzz_ToWadAndFromWad_RoundTrip(
        uint256 amount,
        uint8 decimals
    ) public view {
        // Bound decimals to reasonable ranges (0 to 30)
        decimals = uint8(bound(decimals, 0, 30));

        if (decimals <= 18) {
            amount = bound(amount, 0, type(uint128).max);
            uint256 wad = harness.toWad(amount, decimals);
            uint256 roundTrip = harness.fromWadDown(wad, decimals);
            assertEq(roundTrip, amount);
        }
    }
}
