// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CredditAssetRegistry, AssetNotListed, AssetAlreadyListed, InvalidMaxExposure, ZeroFactor, CollateralFactorTooHigh, LiquidationThresholdTooLow, InvalidLiquidationPenalty, InvalidLiquidationBonus, LiquidationThresholdTooHigh} from "../core/CredditAssetRegistry.sol";
import {ZeroAddressProvided, InvalidDecimals, AssetNotEnabled} from "../core/CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";

contract CredditAssetRegistryTest is Test {
    CredditAssetRegistry public registry;
    CredditAssetRegistry public implementation;

    address public admin = address(0x111);
    address public alice = address(0x222);

    address public mockTokenA = address(0xA1);
    address public mockTokenB = address(0xB2);

    // Default valid risk parameters
    uint16 constant CF_BPS = 7_000; // 70%
    uint16 constant LT_BPS = 7_500; // 75% (CF + 500 BPS safety margin)
    uint16 constant PENALTY_BPS = 1_000; // 10%
    uint16 constant BONUS_BPS = 500; // 5%
    uint256 constant MAX_EXPOSURE = 1_000_000e18;
    uint8 constant DECIMALS = 18;

    event AssetAdded(
        address indexed token,
        uint16 collateralFactorBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps,
        uint16 liquidationBonusBps,
        uint256 maxExposure
    );

    event AssetRiskParamsUpdated(
        address indexed token,
        uint16 collateralFactorBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps,
        uint16 liquidationBonusBps
    );

    event AssetEnabledStatusUpdated(address indexed token, bool isEnabled);
    event AssetMaxExposureUpdated(address indexed token, uint256 maxExposure);

    function setUp() public {
        implementation = new CredditAssetRegistry();

        bytes memory initData = abi.encodeCall(
            CredditAssetRegistry.initialize,
            (admin)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        registry = CredditAssetRegistry(address(proxy));
    }

    /* =========================================================================
     * INITIALIZATION TESTS
     * ========================================================================= */

    function test_Initialize_Success() public view {
        assertTrue(registry.hasRole(CredditRoles.ASSET_ADMIN_ROLE, admin));
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Initialize_RevertIf_ZeroAddressAdmin() public {
        CredditAssetRegistry impl = new CredditAssetRegistry();
        bytes memory initData = abi.encodeCall(
            CredditAssetRegistry.initialize,
            (address(0))
        );

        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), initData);
    }

    function test_Initialize_RevertIf_Reinitialized() public {
        vm.expectRevert();
        registry.initialize(admin);
    }

    /* =========================================================================
     * ADD ASSET TESTS
     * ========================================================================= */

    function test_AddAsset_Success() public {
        vm.startPrank(admin);

        vm.expectEmit(true, false, false, true);
        emit AssetAdded(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE
        );

        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
        vm.stopPrank();

        CredditAssetRegistry.AssetConfig memory config = registry.getAsset(
            mockTokenA
        );

        // Logging values to terminal
        console.log("Token Address:", config.token);
        console.log("Collateral Factor (BPS):", config.collateralFactorBps);
        console.log("Max Exposure:", config.maxExposure);
        console.log("Is Enabled:", config.isEnabled);

        assertEq(config.token, mockTokenA);
        assertEq(config.collateralFactorBps, CF_BPS);
        assertEq(config.liquidationThresholdBps, LT_BPS);
        assertEq(config.liquidationPenaltyBps, PENALTY_BPS);
        assertEq(config.liquidationBonusBps, BONUS_BPS);
        assertEq(config.maxExposure, MAX_EXPOSURE);
        assertEq(config.decimals, DECIMALS);
        assertTrue(config.isEnabled);
        assertTrue(config.isListed);
    }

    function test_AddAsset_RevertIf_NotAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
    }

    function test_AddAsset_RevertIf_ZeroTokenAddress() public {
        vm.prank(admin);
        vm.expectRevert(ZeroAddressProvided.selector);
        registry.addAsset(
            address(0),
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
    }

    function test_AddAsset_RevertIf_ZeroMaxExposure() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(InvalidMaxExposure.selector, 0));
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            0,
            DECIMALS
        );
    }

    function test_AddAsset_RevertIf_InvalidDecimals() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(InvalidDecimals.selector, 31));
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            31
        );
    }

    function test_AddAsset_RevertIf_AlreadyListed() public {
        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        vm.expectRevert(
            abi.encodeWithSelector(AssetAlreadyListed.selector, mockTokenA)
        );
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
        vm.stopPrank();
    }

    /* =========================================================================
     * RISK PARAMETER VALIDATION BOUNDARY TESTS
     ========================================================================= */

    function test_RiskParams_RevertIf_ZeroFactor() public {
        vm.startPrank(admin);

        vm.expectRevert(ZeroFactor.selector);
        registry.addAsset(
            mockTokenA,
            0,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        vm.expectRevert(ZeroFactor.selector);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            0,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        vm.stopPrank();
    }

    function test_RiskParams_RevertIf_CollateralFactorTooHigh() public {
        vm.prank(admin);
        uint16 highCF = 8_501; // MAX is 8500
        vm.expectRevert(
            abi.encodeWithSelector(CollateralFactorTooHigh.selector, highCF)
        );
        registry.addAsset(
            mockTokenA,
            highCF,
            9_100,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
    }

    function test_RiskParams_RevertIf_SafetyMarginInsufficient() public {
        vm.prank(admin);
        // Safety margin requires LT >= CF + 500. Here LT is CF + 499.
        uint16 lowLT = CF_BPS + 499;
        vm.expectRevert(
            abi.encodeWithSelector(
                LiquidationThresholdTooLow.selector,
                CF_BPS,
                lowLT
            )
        );
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            lowLT,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
    }

    function test_RiskParams_RevertIf_LiquidationThresholdTooHigh() public {
        vm.prank(admin);
        uint16 highLT = 10_001; // MAX_BPS is 10000
        vm.expectRevert(
            abi.encodeWithSelector(LiquidationThresholdTooHigh.selector, highLT)
        );
        registry.addAsset(
            mockTokenA,
            8_000,
            highLT,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
    }

    function test_RiskParams_RevertIf_PenaltyOutOfBounds() public {
        vm.startPrank(admin);

        // Too low (< 200)
        vm.expectRevert(
            abi.encodeWithSelector(InvalidLiquidationPenalty.selector, 199)
        );
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            199,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        // Too high (> 1500)
        vm.expectRevert(
            abi.encodeWithSelector(InvalidLiquidationPenalty.selector, 1_501)
        );
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            1_501,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        vm.stopPrank();
    }

    function test_RiskParams_RevertIf_BonusExceedsPenalty() public {
        vm.prank(admin);
        // Bonus (1100 BPS) > Penalty (1000 BPS)
        vm.expectRevert(
            abi.encodeWithSelector(InvalidLiquidationBonus.selector, 1_100)
        );
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            1_100,
            MAX_EXPOSURE,
            DECIMALS
        );
    }

    /* =========================================================================
     * UPDATE & MANAGEMENT TESTS
     * ========================================================================= */

    function test_UpdateAssetRiskParams_Success() public {
        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        uint16 newCF = 6_000;
        uint16 newLT = 7_000;
        uint16 newPenalty = 1_200;
        uint16 newBonus = 600;

        vm.expectEmit(true, false, false, true);
        emit AssetRiskParamsUpdated(
            mockTokenA,
            newCF,
            newLT,
            newPenalty,
            newBonus
        );

        registry.updateAssetRiskParams(
            mockTokenA,
            newCF,
            newLT,
            newPenalty,
            newBonus
        );
        vm.stopPrank();

        CredditAssetRegistry.AssetConfig memory config = registry.getAsset(
            mockTokenA
        );
        assertEq(config.collateralFactorBps, newCF);
        assertEq(config.liquidationThresholdBps, newLT);
    }

    function test_UpdateAssetRiskParams_RevertIf_DisabledOrUnlisted() public {
        vm.startPrank(admin);
        // Unlisted
        vm.expectRevert(
            abi.encodeWithSelector(AssetNotListed.selector, mockTokenA)
        );
        registry.updateAssetRiskParams(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS
        );

        // Listed but disabled
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
        registry.toggleEnableStatus(mockTokenA);

        vm.expectRevert(
            abi.encodeWithSelector(AssetNotEnabled.selector, mockTokenA)
        );
        registry.updateAssetRiskParams(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS
        );
        vm.stopPrank();
    }

    function test_SetMaxExposure_Success() public {
        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        uint256 newExposure = 5_000_000e18;
        vm.expectEmit(true, false, false, true);
        emit AssetMaxExposureUpdated(mockTokenA, newExposure);

        registry.setMaxExposure(mockTokenA, newExposure);
        vm.stopPrank();

        assertEq(registry.getAsset(mockTokenA).maxExposure, newExposure);
    }

    function test_ToggleEnableStatus_Success() public {
        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        vm.expectEmit(true, false, false, true);
        emit AssetEnabledStatusUpdated(mockTokenA, false);
        registry.toggleEnableStatus(mockTokenA);
        assertFalse(registry.isEnabled(mockTokenA));

        vm.expectEmit(true, false, false, true);
        emit AssetEnabledStatusUpdated(mockTokenA, true);
        registry.toggleEnableStatus(mockTokenA);
        assertTrue(registry.isEnabled(mockTokenA));

        vm.stopPrank();
    }

    function test_RemoveAsset_Success() public {
        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        registry.removeAsset(mockTokenA);
        vm.stopPrank();

        assertFalse(registry.isListed(mockTokenA));
        vm.expectRevert(
            abi.encodeWithSelector(AssetNotListed.selector, mockTokenA)
        );
        registry.getAsset(mockTokenA);
    }

    /* =========================================================================
     * VIEW FUNCTION TESTS
     * ========================================================================= */

    function test_ListAssets_Filtering() public {
        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
        registry.addAsset(
            mockTokenB,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );

        // Disable Token B
        registry.toggleEnableStatus(mockTokenB);
        vm.stopPrank();

        // onlyEnabled = true -> returns 1 asset (Token A)
        CredditAssetRegistry.AssetConfig[] memory enabledOnly = registry
            .listAssets(true);
        assertEq(enabledOnly.length, 1);
        assertEq(enabledOnly[0].token, mockTokenA);

        // onlyEnabled = false -> returns 2 assets (Token A & Token B)
        CredditAssetRegistry.AssetConfig[] memory allListed = registry
            .listAssets(false);
        assertEq(allListed.length, 2);
    }

    function test_AssetCount() public {
        assertEq(registry.assetCount(), 0);

        vm.startPrank(admin);
        registry.addAsset(
            mockTokenA,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
        assertEq(registry.assetCount(), 1);

        registry.addAsset(
            mockTokenB,
            CF_BPS,
            LT_BPS,
            PENALTY_BPS,
            BONUS_BPS,
            MAX_EXPOSURE,
            DECIMALS
        );
        assertEq(registry.assetCount(), 2);
        vm.stopPrank();
    }
}
