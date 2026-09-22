// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {CredditInterestRateModel, InvalidKink} from "../core/CredditInterestRateModel.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "../core/CredditErrors.sol";
import {WadMath} from "../libraries/WadMath.sol";

contract CredditInterestRateModelTest is Test {
    CredditInterestRateModel public interestRateModel;
    CredditInterestRateModel public modelImpl;

    address public admin = address(0x1);
    address public riskAdmin = address(0x2);
    address public alice = address(0x3);

    // Standard Default Model Parameters
    // Base Rate: 2% (0.02e18)
    // Kink: 80% (0.80e18)
    // Slope 1: 10% (0.10e18)
    // Slope 2: 100% (1.00e18)
    uint256 constant BASE_RATE = 0.02e18;
    uint256 constant KINK = 0.80e18;
    uint256 constant SLOPE1 = 0.10e18;
    uint256 constant SLOPE2 = 1.00e18;

    event ParamsUpdated(
        uint256 baseRateWad,
        uint256 kinkWad,
        uint256 slope1Wad,
        uint256 slope2Wad
    );

    function setUp() public {
        vm.startPrank(admin);

        // Deploy Implementation & Proxy
        modelImpl = new CredditInterestRateModel();

        CredditInterestRateModel.Params memory defaultParams = CredditInterestRateModel.Params({
            baseRateWad: BASE_RATE,
            kinkWad: KINK,
            slope1Wad: SLOPE1,
            slope2Wad: SLOPE2
        });

        bytes memory initData = abi.encodeCall(
            CredditInterestRateModel.initialize,
            (admin, defaultParams)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(modelImpl), initData);
        interestRateModel = CredditInterestRateModel(address(proxy));

        // Grant RISK_ADMIN_ROLE to riskAdmin
        interestRateModel.grantRole(CredditRoles.RISK_ADMIN_ROLE, riskAdmin);

        vm.stopPrank();
    }

    /* =========================================================================
     * INITIALIZATION & ADMIN TESTS
     ======================================================================== */

    function test_Initialize_Success() public view {
        assertEq(interestRateModel.hasRole(interestRateModel.DEFAULT_ADMIN_ROLE(), admin), true);
        assertEq(interestRateModel.hasRole(CredditRoles.RISK_ADMIN_ROLE, admin), true);

        (uint256 baseRate, uint256 kink, uint256 slope1, uint256 slope2) = interestRateModel.params();
        assertEq(baseRate, BASE_RATE);
        assertEq(kink, KINK);
        assertEq(slope1, SLOPE1);
        assertEq(slope2, SLOPE2);
    }

    function test_Initialize_RevertIf_ZeroAdmin() public {
        CredditInterestRateModel.Params memory defaultParams = CredditInterestRateModel.Params({
            baseRateWad: BASE_RATE,
            kinkWad: KINK,
            slope1Wad: SLOPE1,
            slope2Wad: SLOPE2
        });

        bytes memory initData = abi.encodeCall(
            CredditInterestRateModel.initialize,
            (address(0), defaultParams)
        );

        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(modelImpl), initData);
    }

    function test_Initialize_RevertIf_InvalidKinkZero() public {
        CredditInterestRateModel.Params memory invalidParams = CredditInterestRateModel.Params({
            baseRateWad: BASE_RATE,
            kinkWad: 0, // Invalid Kink
            slope1Wad: SLOPE1,
            slope2Wad: SLOPE2
        });

        bytes memory initData = abi.encodeCall(
            CredditInterestRateModel.initialize,
            (admin, invalidParams)
        );

        vm.expectRevert(abi.encodeWithSelector(InvalidKink.selector, 0));
        new ERC1967Proxy(address(modelImpl), initData);
    }

    function test_Initialize_RevertIf_InvalidKinkExceedsWad() public {
        uint256 badKink = WadMath.WAD + 1;
        CredditInterestRateModel.Params memory invalidParams = CredditInterestRateModel.Params({
            baseRateWad: BASE_RATE,
            kinkWad: badKink,
            slope1Wad: SLOPE1,
            slope2Wad: SLOPE2
        });

        bytes memory initData = abi.encodeCall(
            CredditInterestRateModel.initialize,
            (admin, invalidParams)
        );

        vm.expectRevert(abi.encodeWithSelector(InvalidKink.selector, badKink));
        new ERC1967Proxy(address(modelImpl), initData);
    }

    /* =========================================================================
     * PARAMETER UPDATE TESTS
     ======================================================================== */

    function test_SetParams_Success() public {
        CredditInterestRateModel.Params memory newParams = CredditInterestRateModel.Params({
            baseRateWad: 0.05e18,
            kinkWad: 0.70e18,
            slope1Wad: 0.15e18,
            slope2Wad: 2.00e18
        });

        vm.expectEmit(true, true, true, true);
        emit ParamsUpdated(0.05e18, 0.70e18, 0.15e18, 2.00e18);

        vm.prank(riskAdmin);
        interestRateModel.setParams(newParams);

        (uint256 baseRate, uint256 kink, uint256 slope1, uint256 slope2) = interestRateModel.params();
        assertEq(baseRate, 0.05e18);
        assertEq(kink, 0.70e18);
        assertEq(slope1, 0.15e18);
        assertEq(slope2, 2.00e18);
    }

    function test_SetParams_RevertIf_Unauthorized() public {
        CredditInterestRateModel.Params memory newParams = CredditInterestRateModel.Params({
            baseRateWad: 0.05e18,
            kinkWad: 0.70e18,
            slope1Wad: 0.15e18,
            slope2Wad: 2.00e18
        });

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                alice,
                CredditRoles.RISK_ADMIN_ROLE
            )
        );
        interestRateModel.setParams(newParams);
    }

    function test_SetParams_RevertIf_InvalidKink() public {
        CredditInterestRateModel.Params memory newParams = CredditInterestRateModel.Params({
            baseRateWad: BASE_RATE,
            kinkWad: 0,
            slope1Wad: SLOPE1,
            slope2Wad: SLOPE2
        });

        vm.prank(riskAdmin);
        vm.expectRevert(abi.encodeWithSelector(InvalidKink.selector, 0));
        interestRateModel.setParams(newParams);
    }

    /* =========================================================================
     * UTILIZATION TESTS
     ======================================================================== */

    function test_Utilization_ZeroLiquidityReturnsZero() public view {
        uint256 u = interestRateModel.utilization(100e18, 0);
        assertEq(u, 0);
    }

    function test_Utilization_Calculation() public view {
        // 500 / 1000 = 50% utilization (0.5e18)
        uint256 u = interestRateModel.utilization(500e18, 1000e18);
        assertEq(u, 0.5e18);
    }

    function test_Utilization_FullUtilization() public view {
        uint256 u = interestRateModel.utilization(1000e18, 1000e18);
        assertEq(u, 1e18);
    }

    /* =========================================================================
     * GET BORROW RATE TESTS
     ======================================================================== */

    function test_GetBorrowRateWad_AtZeroUtilization() public view {
        // Rate = BaseRate (2%)
        uint256 rate = interestRateModel.getBorrowRateWad(0, 1000e18);
        assertEq(rate, BASE_RATE);
    }

    function test_GetBorrowRateWad_BelowKink() public view {
        // 40% utilization (0.4e18)
        // Rate = BaseRate + (U * Slope1)
        // Rate = 0.02 + (0.40 * 0.10) = 0.02 + 0.04 = 0.06 (6%)
        uint256 rate = interestRateModel.getBorrowRateWad(400e18, 1000e18);
        assertEq(rate, 0.06e18);
    }

    function test_GetBorrowRateWad_ExactlyAtKink() public view {
        // 80% utilization (0.8e18)
        // Rate = BaseRate + (Kink * Slope1)
        // Rate = 0.02 + (0.80 * 0.10) = 0.02 + 0.08 = 0.10 (10%)
        uint256 rate = interestRateModel.getBorrowRateWad(800e18, 1000e18);
        assertEq(rate, 0.10e18);
    }

    function test_GetBorrowRateWad_AboveKink() public view {
        // 90% utilization (0.9e18)
        // Normal Rate = 0.02 + (0.80 * 0.10) = 0.10 (10%)
        // Excess Utilization = 0.90 - 0.80 = 0.10
        // Excess Rate = 0.10 * 1.00 (Slope2) = 0.10
        // Total Rate = 0.10 + 0.10 = 0.20 (20%)
        uint256 rate = interestRateModel.getBorrowRateWad(900e18, 1000e18);
        assertEq(rate, 0.20e18);
    }

    function test_GetBorrowRateWad_AtFullUtilization() public view {
        // 100% utilization (1.0e18)
        // Normal Rate = 0.10
        // Excess = 0.20 * 1.00 = 0.20
        // Total Rate = 0.10 + 0.20 = 0.30 (30%)
        uint256 rate = interestRateModel.getBorrowRateWad(1000e18, 1000e18);
        assertEq(rate, 0.30e18);
    }
}