// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import {CredditCreditLine, MaxExposureExceeded, TooManyCollateralAssets, InsufficientCollateralBalance, NoActiveDebt, ExceedsCreditLimit, PositionNotLiquidatable, CloseFactorExceeded, InsufficientSeizableCollateral, PositionUnsafeAfterWithdrawal, RouterRepayShortfall} from "../core/CredditCreditLine.sol";
import {CredditAssetRegistry, AssetNotListed} from "../core/CredditAssetRegistry.sol";
import {CredditRiskEngine} from "../core/CredditRiskEngine.sol";
import {CredditLendingRouter} from "../core/CredditLendingRouter.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided, ZeroAmount, AssetNotEnabled} from "../core/CredditErrors.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {MockOracle} from "../mock/MockOracle.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockRiskEngine} from "../mock/MockRiskEngine.sol";
import {MockRouter} from "../mock/MockRouter.sol";

/* =========================================================================
 * TEST SUITE
 * ========================================================================= */

contract CredditCreditLineTest is Test {
    using WadMath for uint256;

    CredditCreditLine public creditLine;
    CredditCreditLine public creditLineImpl;

    CredditAssetRegistry public registry;
    MockRiskEngine public riskEngine;
    MockOracle public oracle;
    MockRouter public router;

    MockERC20 public usdg;
    MockERC20 public stockTokenA;
    MockERC20 public stockTokenB;

    address public admin = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);
    address public liquidator = address(0x4);

    event Borrowed(
        address indexed user,
        uint256 amountWad,
        uint256 sharesMintedWad,
        uint256 newTotalDebtWad
    );
    event Repaid(
        address indexed payer,
        address indexed user,
        uint256 amountRepaid,
        uint256 sharesBurned,
        uint256 newTotalDebt
    );
    event Liquidated(
        address indexed liquidator,
        address indexed user,
        address indexed collateralAsset,
        uint256 debtAmount,
        uint256 collateralToSeize
    );
    event CollateralDeposited(
        address indexed user,
        address indexed asset,
        uint256 amount
    );
    event CollateralWithdrawn(
        address indexed user,
        address indexed asset,
        uint256 amount
    );

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy Tokens
        usdg = new MockERC20("USDG Stablecoin", "USDG", 18);
        stockTokenA = new MockERC20("Apple Stock Token", "aAAPL", 18);
        stockTokenB = new MockERC20("Tesla Stock Token", "aTSLA", 18);

        // 2. Deploy Asset Registry
        CredditAssetRegistry registryImpl = new CredditAssetRegistry();
        bytes memory regInit = abi.encodeCall(
            CredditAssetRegistry.initialize,
            (admin)
        );
        ERC1967Proxy regProxy = new ERC1967Proxy(
            address(registryImpl),
            regInit
        );
        registry = CredditAssetRegistry(address(regProxy));

        // Grant ASSET_ADMIN_ROLE to admin if required by your registry implementation
        registry.grantRole(CredditRoles.ASSET_ADMIN_ROLE, admin);

        // Add Stock Tokens using addAsset
        registry.addAsset(
            address(stockTokenA),
            8000, // collateralFactorBps
            8500, // liquidationThresholdBps
            1000, // liquidationPenaltyBps
            500, // liquidationBonusBps
            1_000_000e18, // maxExposure
            18 // decimals
        );

        registry.addAsset(
            address(stockTokenB),
            7000, // collateralFactorBps
            7500, // liquidationThresholdBps
            1000, // liquidationPenaltyBps
            500, // liquidationBonusBps
            500_000e18, // maxExposure
            18 // decimals
        );

        // 3. Deploy Mock Infrastructure
        oracle = new MockOracle();
        oracle.setPrice(address(usdg), 1e18); // $1.00
        oracle.setPrice(address(stockTokenA), 150e18); // $150.00
        oracle.setPrice(address(stockTokenB), 200e18); // $200.00

        riskEngine = new MockRiskEngine();
        router = new MockRouter(address(usdg));

        // 4. Deploy CredditCreditLine
        creditLineImpl = new CredditCreditLine();
        bytes memory clInit = abi.encodeCall(
            CredditCreditLine.initialize,
            (
                admin,
                address(registry),
                address(usdg),
                address(riskEngine),
                address(oracle),
                address(router)
            )
        );
        ERC1967Proxy clProxy = new ERC1967Proxy(
            address(creditLineImpl),
            clInit
        );
        creditLine = CredditCreditLine(address(clProxy));

        vm.stopPrank();

        // 5. Mint tokens & set allowances
        usdg.mint(address(router), 10_000_000e18);
        usdg.mint(alice, 500_000e18);
        usdg.mint(liquidator, 500_000e18);

        stockTokenA.mint(alice, 10_000e18);
        stockTokenB.mint(alice, 10_000e18);

        vm.prank(alice);
        stockTokenA.approve(address(creditLine), type(uint256).max);
        vm.prank(alice);
        stockTokenB.approve(address(creditLine), type(uint256).max);
        vm.prank(alice);
        usdg.approve(address(creditLine), type(uint256).max);

        vm.prank(liquidator);
        usdg.approve(address(creditLine), type(uint256).max);
    }

    /* =========================================================================
     * INITIALIZATION TESTS
     * ========================================================================= */

    function test_Initialize_Success() public view {
        assertEq(address(creditLine.registry()), address(registry));
        assertEq(address(creditLine.riskEngine()), address(riskEngine));
        assertEq(address(creditLine.oracle()), address(oracle));
        assertEq(address(creditLine.router()), address(router));
        assertEq(address(creditLine.usdg()), address(usdg));
        assertEq(creditLine.debtIndexWad(), 1e18);
    }

    function test_Initialize_RevertIf_ZeroAddress() public {
        bytes memory initData = abi.encodeCall(
            CredditCreditLine.initialize,
            (
                address(0),
                address(registry),
                address(usdg),
                address(riskEngine),
                address(oracle),
                address(router)
            )
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(creditLineImpl), initData);
    }

    /* =========================================================================
     * COLLATERAL DEPOSIT TESTS
     * ========================================================================= */

    function test_DepositCollateral_Success() public {
        vm.expectEmit(true, true, false, true);
        emit CollateralDeposited(alice, address(stockTokenA), 100e18);

        vm.prank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);

        assertEq(creditLine.collateralOf(alice, address(stockTokenA)), 100e18);
        assertEq(creditLine.totalDeposited(address(stockTokenA)), 100e18);
    }

    function test_DepositCollateral_RevertIf_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ZeroAmount.selector);
        creditLine.depositCollateral(address(stockTokenA), 0);
    }

    function test_DepositCollateral_RevertIf_AssetNotListed() public {
        MockERC20 unlistedToken = new MockERC20("Unlisted", "UNL", 18);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssetNotListed.selector,
                address(unlistedToken)
            )
        );
        creditLine.depositCollateral(address(unlistedToken), 10e18);
    }

    function test_DepositCollateral_RevertIf_AssetNotEnabled() public {
        // Disable an existing listed asset in the registry
        vm.prank(admin);
        registry.toggleEnableStatus(address(stockTokenA));

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssetNotEnabled.selector,
                address(stockTokenA)
            )
        );
        creditLine.depositCollateral(address(stockTokenA), 10e18);
    }

    function test_DepositCollateral_RevertIf_MaxExposureExceeded() public {
        uint256 overExposure = 1_000_001e18;
        stockTokenA.mint(alice, overExposure);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                MaxExposureExceeded.selector,
                address(stockTokenA),
                overExposure,
                1_000_000e18
            )
        );
        creditLine.depositCollateral(address(stockTokenA), overExposure);
    }

    /* =========================================================================
     * COLLATERAL WITHDRAWAL TESTS
     * ========================================================================= */

    function test_WithdrawCollateral_Success() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);

        vm.expectEmit(true, true, false, true);
        emit CollateralWithdrawn(alice, address(stockTokenA), 40e18);

        creditLine.withdrawCollateral(address(stockTokenA), 40e18);
        vm.stopPrank();

        assertEq(creditLine.collateralOf(alice, address(stockTokenA)), 60e18);
        assertEq(creditLine.totalDeposited(address(stockTokenA)), 60e18);
    }

    function test_WithdrawCollateral_RevertIf_InsufficientBalance() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 50e18);

        vm.expectRevert(
            abi.encodeWithSelector(
                InsufficientCollateralBalance.selector,
                address(stockTokenA),
                100e18,
                50e18
            )
        );
        creditLine.withdrawCollateral(address(stockTokenA), 100e18);
        vm.stopPrank();
    }

    function test_WithdrawCollateral_RevertIf_PositionUnsafeAfterWithdrawal()
        public
    {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);

        riskEngine.setCreditLimit(alice, 10_000e18);
        creditLine.borrow(5_000e18);

        // Mock remaining collateral being unsafe to support current debt
        riskEngine.setRiskAdjustedValue(alice, 4_000e18);

        vm.expectRevert(PositionUnsafeAfterWithdrawal.selector);
        creditLine.withdrawCollateral(address(stockTokenA), 50e18);
        vm.stopPrank();
    }

    /* =========================================================================
     * BORROW & REPAY TESTS
     * ========================================================================= */

    function test_Borrow_Success() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);

        riskEngine.setCreditLimit(alice, 10_000e18);

        vm.expectEmit(true, false, false, true);
        emit Borrowed(alice, 5_000e18, 5_000e18, 5_000e18);

        creditLine.borrow(5_000e18);
        vm.stopPrank();

        assertEq(creditLine.debtShares(alice), 5_000e18);
        assertEq(creditLine.totalDebtShares(), 5_000e18);
    }

    function test_Borrow_RevertIf_ExceedsCreditLimit() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);

        riskEngine.setCreditLimit(alice, 5_000e18);

        vm.expectRevert(
            abi.encodeWithSelector(
                ExceedsCreditLimit.selector,
                6_000e18,
                5_000e18
            )
        );
        creditLine.borrow(6_000e18);
        vm.stopPrank();
    }

    function test_Repay_FullRepayment() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(alice, 10_000e18);
        creditLine.borrow(5_000e18);

        creditLine.repay(5_000e18);
        vm.stopPrank();

        assertEq(creditLine.debtShares(alice), 0);
        assertEq(creditLine.totalDebtShares(), 0);
    }

    function test_Repay_PartialRepayment() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(alice, 10_000e18);
        creditLine.borrow(5_000e18);

        creditLine.repay(2_000e18);
        vm.stopPrank();

        assertEq(creditLine.debtShares(alice), 3_000e18);
        assertEq(creditLine.totalDebtShares(), 3_000e18);
    }

    function test_Repay_RevertIf_NoActiveDebt() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NoActiveDebt.selector, alice));
        creditLine.repay(100e18);
    }

    /* =========================================================================
     * LIQUIDATION TESTS
     * ========================================================================= */

    function test_Liquidate_Success() public {
        // Alice deposits collateral and borrows USDG
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18); // Value: $15,000
        riskEngine.setCreditLimit(alice, 10_000e18);
        creditLine.borrow(8_000e18);
        vm.stopPrank();

        // Position becomes liquidatable due to price drop or risk adjustment
        riskEngine.setIsLiquidatable(alice, true);

        uint256 debtToCover = 4_000e18; // Repay 50% (Close factor is 50%)

        vm.prank(liquidator);
        creditLine.liquidate(alice, address(stockTokenA), debtToCover);

        assertEq(creditLine.debtShares(alice), 4_000e18);
        assertGt(stockTokenA.balanceOf(liquidator), 0);
    }

    function test_Liquidate_RevertIf_PositionNotLiquidatable() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(alice, 10_000e18);
        creditLine.borrow(5_000e18);
        vm.stopPrank();

        riskEngine.setIsLiquidatable(alice, false);

        vm.prank(liquidator);
        vm.expectRevert(
            abi.encodeWithSelector(
                PositionNotLiquidatable.selector,
                alice,
                5_000e18
            )
        );
        creditLine.liquidate(alice, address(stockTokenA), 2_000e18);
    }

    function test_Liquidate_RevertIf_CloseFactorExceeded() public {
        vm.startPrank(alice);
        creditLine.depositCollateral(address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(alice, 10_000e18);
        creditLine.borrow(8_000e18);
        vm.stopPrank();

        riskEngine.setIsLiquidatable(alice, true);

        // Attempt to liquidate 60% when max close factor is 50% (4,000e18)
        vm.prank(liquidator);
        vm.expectRevert(
            abi.encodeWithSelector(
                CloseFactorExceeded.selector,
                4_800e18,
                4_000e18
            )
        );
        creditLine.liquidate(alice, address(stockTokenA), 4_800e18);
    }

    /* =========================================================================
     * PAUSE CONTROL TESTS
     * ========================================================================= */

    function test_Pause_PreventsActions() public {
        vm.prank(admin);
        creditLine.pause();

        vm.startPrank(alice);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.depositCollateral(address(stockTokenA), 10e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.withdrawCollateral(address(stockTokenA), 10e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.borrow(100e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.repay(100e18);
        vm.stopPrank();
    }
}
