// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import {CredditCore} from "../core/CredditCore.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "../core/CredditErrors.sol";

/* =========================================================================
 * CONCRETE HARNESS FOR ABSTRACT CLASS
 * ========================================================================= */

contract CredditCoreHarness is CredditCore {
    uint256 public value;

    function initialize(address defaultAdmin) external initializer {
        __CredditCore_init(defaultAdmin);
    }

    function setValue(uint256 _value) external whenNotPaused {
        value = _value;
    }

    function setValueProtected(uint256 _value) external nonReentrant {
        value = _value;
    }
}

contract CredditCoreV2Harness is CredditCore {
    uint256 public value;

    function initialize(address defaultAdmin) external initializer {
        __CredditCore_init(defaultAdmin);
    }

    function version() external pure returns (string memory) {
        return "V2";
    }
}

/* =========================================================================
 * TEST SUITE
 * ========================================================================= */

contract CredditCoreTest is Test {
    CredditCoreHarness public core;
    CredditCoreHarness public coreImpl;

    address public admin = address(0x1);
    address public pauser = address(0x2);
    address public user = address(0x3);

    event SystemPaused(address indexed pauser, uint256 timestamp);
    event SystemUnpaused(address indexed unpauser, uint256 timestamp);

    function setUp() public {
        vm.startPrank(admin);

        coreImpl = new CredditCoreHarness();
        bytes memory initData = abi.encodeCall(
            CredditCoreHarness.initialize,
            (admin)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(coreImpl), initData);
        core = CredditCoreHarness(address(proxy));

        vm.stopPrank();
    }

    /* =========================================================================
     * INITIALIZATION TESTS
     * ========================================================================= */

    function test_Initialize_Success() public view {
        assertTrue(core.hasRole(core.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(core.hasRole(CredditRoles.PAUSER_ROLE, admin));
        assertEq(core.owner(), admin);
        assertFalse(core.paused());
    }

    function test_Initialize_RevertIf_ZeroAddress() public {
        CredditCoreHarness impl = new CredditCoreHarness();
        bytes memory initData = abi.encodeCall(
            CredditCoreHarness.initialize,
            (address(0))
        );

        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), initData);
    }

    function test_Initialize_CannotReinitialize() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        core.initialize(admin);
    }

    function test_Implementation_CannotBeInitialized() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        coreImpl.initialize(admin);
    }

    /* =========================================================================
     * PAUSE & UNPAUSE TESTS
     * ========================================================================= */

    function test_Pause_Success() public {
        vm.prank(admin);
        core.pause();

        assertTrue(core.paused());
    }

    function test_Unpause_Success() public {
        vm.startPrank(admin);
        core.pause();
        assertTrue(core.paused());

        core.unpause();
        assertFalse(core.paused());
        vm.stopPrank();
    }

    function test_Pause_RevertIf_Unauthorized() public {
        bytes32 pauserRole = CredditRoles.PAUSER_ROLE;

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                pauserRole
            )
        );
        core.pause();
    }

    function test_Unpause_RevertIf_Unauthorized() public {
        vm.prank(admin);
        core.pause();

        bytes32 pauserRole = CredditRoles.PAUSER_ROLE;

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                pauserRole
            )
        );
        core.unpause();
    }

    function test_Pause_GrantsAndRevokesRole() public {
        // Grant PAUSER_ROLE to pauser account
        vm.prank(admin);
        core.grantRole(CredditRoles.PAUSER_ROLE, pauser);

        // Pauser can pause
        vm.prank(pauser);
        core.pause();
        assertTrue(core.paused());

        // Revoke role
        vm.prank(admin);
        core.revokeRole(CredditRoles.PAUSER_ROLE, pauser);

        // Pauser can no longer unpause
        vm.prank(pauser);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                pauser,
                CredditRoles.PAUSER_ROLE
            )
        );
        core.unpause();
    }

    function test_WhenNotPaused_ModifierEnforced() public {
        vm.prank(admin);
        core.pause();

        vm.prank(user);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        core.setValue(42);
    }

    /* =========================================================================
     * UUPS UPGRADE TESTS
     * ========================================================================= */

    function test_UpgradeTo_Success() public {
        CredditCoreV2Harness v2Impl = new CredditCoreV2Harness();

        vm.prank(admin);
        core.upgradeToAndCall(address(v2Impl), "");

        CredditCoreV2Harness upgraded = CredditCoreV2Harness(address(core));
        assertEq(upgraded.version(), "V2");
    }

    function test_UpgradeTo_RevertIf_Unauthorized() public {
        CredditCoreV2Harness v2Impl = new CredditCoreV2Harness();
        bytes32 adminRole = core.DEFAULT_ADMIN_ROLE();

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                adminRole
            )
        );
        core.upgradeToAndCall(address(v2Impl), "");
    }
}
