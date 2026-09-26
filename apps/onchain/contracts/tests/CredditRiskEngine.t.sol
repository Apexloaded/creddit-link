// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CredditRiskEngine, InvalidCapBps} from "../core/CredditRiskEngine.sol";
import {CredditAssetRegistry} from "../core/CredditAssetRegistry.sol";
import {ZeroAddressProvided} from "../core/CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {ICollateralSource} from "../interfaces/ICollateralSource.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {MockOracle} from "../mock/MockOracle.sol";

contract MockCollateralSource is ICollateralSource {
    mapping(address => mapping(address => uint256)) public collateral;

    function setCollateral(
        address user,
        address asset,
        uint256 amount
    ) external {
        collateral[user][asset] = amount;
    }

    function collateralOf(
        address user,
        address asset
    ) external view returns (uint256) {
        return collateral[user][asset];
    }
}

contract CredditRiskEngineTest is Test {
    using WadMath for uint256;

    CredditRiskEngine public riskEngine;
    CredditRiskEngine public riskEngineImpl;

    CredditAssetRegistry public registry;
    CredditAssetRegistry public registryImpl;

    MockOracle public oracle;
    MockCollateralSource public source;

    address public admin = address(0x111);
    address public alice = address(0x222);

    address public mockTokenA = address(0xA1);
    address public mockTokenB = address(0xB2);

    uint256 public constant INITIAL_CAP_WAD = 0.90e18; // 90%
    uint256 public constant INITIAL_MAX_ASSETS = 5;
    uint256 public constant INITIAL_CLOSE_FACTOR_WAD = 0.50e18; // 50%

    // Default Risk Params for Registry
    uint16 constant CF_BPS_A = 7_000; // 70%
    uint16 constant LT_BPS_A = 7_500; // 75%
    uint16 constant CF_BPS_B = 8_000; // 80%
    uint16 constant LT_BPS_B = 8_500; // 85%

    event UtilizationCapUpdated(uint256 newCapWad);
    event MaxCollateralAssetsUpdated(uint256 newMax);
    event LiquidationCloseFactorUpdated(uint256 newCloseFactorWad);

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy AssetRegistry via deployCode to keep test contract bytecode size minimal
        address regImplAddr = deployCode(
            "CredditAssetRegistry.sol:CredditAssetRegistry"
        );
        registryImpl = CredditAssetRegistry(regImplAddr);

        bytes memory regInitData = abi.encodeCall(
            CredditAssetRegistry.initialize,
            (admin)
        );
        ERC1967Proxy regProxy = new ERC1967Proxy(
            address(registryImpl),
            regInitData
        );
        registry = CredditAssetRegistry(address(regProxy));

        // 2. Deploy Mocks
        oracle = new MockOracle();
        source = new MockCollateralSource();

        // 3. Deploy RiskEngine via deployCode
        address riskImplAddr = deployCode(
            "CredditRiskEngine.sol:CredditRiskEngine"
        );
        riskEngineImpl = CredditRiskEngine(riskImplAddr);

        bytes memory riskInitData = abi.encodeCall(
            CredditRiskEngine.initialize,
            (
                admin,
                address(registry),
                address(oracle),
                INITIAL_CAP_WAD,
                INITIAL_MAX_ASSETS,
                INITIAL_CLOSE_FACTOR_WAD
            )
        );
        ERC1967Proxy riskProxy = new ERC1967Proxy(
            address(riskEngineImpl),
            riskInitData
        );
        riskEngine = CredditRiskEngine(address(riskProxy));

        // 4. Populate Asset Registry
        registry.addAsset(
            mockTokenA,
            CF_BPS_A,
            LT_BPS_A,
            1_000,
            500,
            1_000_000e18,
            18
        );
        registry.addAsset(
            mockTokenB,
            CF_BPS_B,
            LT_BPS_B,
            1_000,
            500,
            1_000_000e18,
            6
        );

        vm.stopPrank();
    }

    /* =========================================================================
     * INITIALIZATION TESTS
     * ========================================================================= */

    function test_Initialize_Success() public view {
        assertEq(address(riskEngine.registry()), address(registry));
        assertEq(address(riskEngine.oracle()), address(oracle));
        assertEq(riskEngine.creditUtilizationCapWad(), INITIAL_CAP_WAD);
        assertEq(riskEngine.maxCollateralAssetsPerUser(), INITIAL_MAX_ASSETS);
        assertEq(
            riskEngine.liquidationCloseFactorWad(),
            INITIAL_CLOSE_FACTOR_WAD
        );
        assertTrue(riskEngine.hasRole(CredditRoles.RISK_ADMIN_ROLE, admin));
        assertTrue(riskEngine.hasRole(riskEngine.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Initialize_RevertIf_ZeroAddress() public {
        CredditRiskEngine impl = new CredditRiskEngine();

        // Zero Admin
        bytes memory data = abi.encodeCall(
            CredditRiskEngine.initialize,
            (
                address(0),
                address(registry),
                address(oracle),
                INITIAL_CAP_WAD,
                INITIAL_MAX_ASSETS,
                INITIAL_CLOSE_FACTOR_WAD
            )
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), data);

        // Zero Registry
        data = abi.encodeCall(
            CredditRiskEngine.initialize,
            (
                admin,
                address(0),
                address(oracle),
                INITIAL_CAP_WAD,
                INITIAL_MAX_ASSETS,
                INITIAL_CLOSE_FACTOR_WAD
            )
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), data);

        // Zero Oracle
        data = abi.encodeCall(
            CredditRiskEngine.initialize,
            (
                admin,
                address(registry),
                address(0),
                INITIAL_CAP_WAD,
                INITIAL_MAX_ASSETS,
                INITIAL_CLOSE_FACTOR_WAD
            )
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), data);
    }

    function test_Initialize_RevertIf_Reinitialized() public {
        vm.expectRevert();
        riskEngine.initialize(
            admin,
            address(registry),
            address(oracle),
            INITIAL_CAP_WAD,
            INITIAL_MAX_ASSETS,
            INITIAL_CLOSE_FACTOR_WAD
        );
    }

    /* =========================================================================
     * ADMIN PARAMETER SETTERS
     * ========================================================================= */

    function test_SetCreditUtilizationCap_Success() public {
        uint256 newCap = 0.85e18;

        vm.expectEmit(true, false, false, true);
        emit UtilizationCapUpdated(newCap);

        vm.prank(admin);
        riskEngine.setCreditUtilizationCap(newCap);

        assertEq(riskEngine.creditUtilizationCapWad(), newCap);
    }

    function test_SetCreditUtilizationCap_RevertIf_InvalidCap() public {
        vm.startPrank(admin);

        // Cap == 0
        vm.expectRevert(abi.encodeWithSelector(InvalidCapBps.selector, 0));
        riskEngine.setCreditUtilizationCap(0);

        // Cap > 1e18
        vm.expectRevert(
            abi.encodeWithSelector(InvalidCapBps.selector, 1e18 + 1)
        );
        riskEngine.setCreditUtilizationCap(1e18 + 1);

        vm.stopPrank();
    }

    function test_SetCreditUtilizationCap_RevertIf_NotAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        riskEngine.setCreditUtilizationCap(0.80e18);
    }

    function test_SetMaxCollateralAssetsPerUser_Success() public {
        uint256 newMax = 10;

        vm.expectEmit(true, false, false, true);
        emit MaxCollateralAssetsUpdated(newMax);

        vm.prank(admin);
        riskEngine.setMaxCollateralAssetsPerUser(newMax);

        assertEq(riskEngine.maxCollateralAssetsPerUser(), newMax);
    }

    function test_SetLiquidationCloseFactor_Success() public {
        uint256 newCloseFactor = 0.60e18;

        vm.expectEmit(true, false, false, true);
        emit LiquidationCloseFactorUpdated(newCloseFactor);

        vm.prank(admin);
        riskEngine.setLiquidationCloseFactor(newCloseFactor);

        assertEq(riskEngine.liquidationCloseFactorWad(), newCloseFactor);
    }

    function test_SetLiquidationCloseFactor_RevertIf_InvalidFactor() public {
        vm.startPrank(admin);

        vm.expectRevert(abi.encodeWithSelector(InvalidCapBps.selector, 0));
        riskEngine.setLiquidationCloseFactor(0);

        vm.expectRevert(
            abi.encodeWithSelector(InvalidCapBps.selector, WadMath.WAD + 1)
        );
        riskEngine.setLiquidationCloseFactor(WadMath.WAD + 1);

        vm.stopPrank();
    }

    /* =========================================================================
     * RISK CALCULATION TESTS
     * ========================================================================= */

    function test_RiskAdjustedValue_SingleAsset() public {
        // Setup Token A (18 decimals): 2 WAD collateral @ $2000/token
        // Value = 2 * 2000 = $4000 WAD
        // CF = 70% (0.70e18)
        // Expected Risk-Adjusted Value = $4000 * 0.70 = $2800 WAD (2800e18)
        oracle.setPrice(mockTokenA, 2000e18);
        source.setCollateral(alice, mockTokenA, 2e18);

        (uint256 value, , ) = riskEngine.riskAdjustedValue(
            address(source),
            alice,
            false
        );
        assertEq(value, 2800e18);
    }

    function test_RiskAdjustedValue_HandlesDecimalsCorrectly() public {
        // Setup Token B (6 decimals, e.g. USDC): 1000e6 @ $1/token
        // Collateral WAD = 1000e18
        // Value = 1000e18
        // CF = 80% (0.80e18)
        // Expected Risk-Adjusted Value = 1000e18 * 0.80 = 800e18
        oracle.setPrice(mockTokenB, 1e18);
        source.setCollateral(alice, mockTokenB, 1000e6);

        (uint256 value, , ) = riskEngine.riskAdjustedValue(
            address(source),
            alice,
            false
        );
        assertEq(value, 800e18);
    }

    function test_CreditLimit_Calculation() public {
        // Setup Token A: Risk-adjusted value = $2800 WAD
        // Credit Utilization Cap = 90% (0.90e18)
        // Expected Credit Limit = $2800 * 0.90 = $2520 WAD
        oracle.setPrice(mockTokenA, 2000e18);
        source.setCollateral(alice, mockTokenA, 2e18);

        uint256 limit = riskEngine.creditLimit(address(source), alice);
        assertEq(limit, 2520e18);
    }

    function test_IsLiquidatable_Evaluation() public {
        // Setup Token A: Collateral 2 units @ $2000 = $4000 total
        // Risk-Adjusted Value (Liquidation value using CF) = $2800
        oracle.setPrice(mockTokenA, 2000e18);
        source.setCollateral(alice, mockTokenA, 2e18);

        // 1. Zero debt is never liquidatable
        assertFalse(riskEngine.isLiquidatable(address(source), alice, 0));

        // 2. Debt <= Liquidation Value ($2800) -> Healthy
        assertFalse(riskEngine.isLiquidatable(address(source), alice, 2800e18));

        // 3. Debt > Liquidation Value ($2801) -> Liquidatable
        assertTrue(riskEngine.isLiquidatable(address(source), alice, 2801e18));
    }
}
