// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import {CredditCreditLine, MaxExposureExceeded, TooManyCollateralAssets, InsufficientCollateralBalance, NoActiveDebt, ExceedsCreditLimit, PositionNotLiquidatable, InsufficientSeizableCollateral, PositionUnsafeAfterWithdrawal, RouterRepayShortfall, PositionDoesNotExist, NotPositionOwner} from "../core/CredditCreditLine.sol";
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
import {CredditTreasury} from "../core/CredditTreasury.sol";

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
    CredditTreasury public treasury;

    MockERC20 public usdg;
    MockERC20 public stockTokenA;
    MockERC20 public stockTokenB;

    address public admin = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);
    address public liquidator = address(0x4);

    event PositionOpened(uint256 indexed positionId, address indexed owner);
    event Borrowed(
        uint256 indexed positionId,
        address indexed owner,
        uint256 amountWad,
        uint256 sharesMintedWad,
        uint256 newTotalDebtWad
    );
    event Repaid(
        uint256 indexed positionId,
        address indexed payer,
        address indexed owner,
        uint256 amountRepaid,
        uint256 sharesBurned,
        uint256 newTotalDebt
    );
    event Liquidated(
        uint256 indexed positionId,
        address indexed liquidator,
        address indexed owner,
        address collateralAsset,
        uint256 debtAmount,
        uint256 collateralToSeize
    );
    event CollateralDeposited(
        uint256 indexed positionId,
        address indexed depositor,
        address indexed asset,
        uint256 amount
    );
    event CollateralWithdrawn(
        uint256 indexed positionId,
        address indexed recipient,
        address indexed asset,
        uint256 amount
    );

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy Tokens
        usdg = new MockERC20("USDG Stablecoin", "USDG", 18, admin);
        stockTokenA = new MockERC20("Apple Stock Token", "aAAPL", 18, admin);
        stockTokenB = new MockERC20("Tesla Stock Token", "aTSLA", 18, admin);

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
        treasury = new CredditTreasury();

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
                address(router),
                payable(treasury)
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
     * INITIALIZATION & POSITION LIFECYCLE TESTS
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
                address(router),
                payable(treasury)
            )
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(creditLineImpl), initData);
    }

    function test_OpenPosition_Success() public {
        vm.startPrank(alice);
        vm.expectEmit(true, true, false, true);
        emit PositionOpened(1, alice);

        uint256 posId = creditLine.openPosition();
        vm.stopPrank();

        assertEq(posId, 1);
        assertEq(creditLine.getPositionOwner(posId), alice);
    }

    /* =========================================================================
     * COLLATERAL DEPOSIT TESTS
     * ========================================================================= */

    function test_DepositCollateral_Success() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();

        vm.expectEmit(true, true, true, true);
        emit CollateralDeposited(posId, alice, address(stockTokenA), 100e18);

        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);
        vm.stopPrank();

        assertEq(creditLine.collateralOf(posId, address(stockTokenA)), 100e18);
        assertEq(creditLine.totalDeposited(address(stockTokenA)), 100e18);
    }

    function test_DepositCollateral_RevertIf_ZeroAmount() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();

        vm.expectRevert(ZeroAmount.selector);
        creditLine.depositCollateral(posId, address(stockTokenA), 0);
        vm.stopPrank();
    }

    function test_DepositCollateral_RevertIf_AssetNotListed() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        MockERC20 unlistedToken = new MockERC20("Unlisted", "UNL", 18, admin);

        vm.expectRevert(
            abi.encodeWithSelector(
                AssetNotListed.selector,
                address(unlistedToken)
            )
        );
        creditLine.depositCollateral(posId, address(unlistedToken), 10e18);
        vm.stopPrank();
    }

    function test_DepositCollateral_RevertIf_AssetNotEnabled() public {
        vm.prank(alice);
        uint256 posId = creditLine.openPosition();

        vm.prank(admin);
        registry.toggleEnableStatus(address(stockTokenA));

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssetNotEnabled.selector,
                address(stockTokenA)
            )
        );
        creditLine.depositCollateral(posId, address(stockTokenA), 10e18);
    }

    function test_DepositCollateral_RevertIf_MaxExposureExceeded() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();

        uint256 overExposure = 1_000_001e18;
        stockTokenA.mint(alice, overExposure);

        vm.expectRevert(
            abi.encodeWithSelector(
                MaxExposureExceeded.selector,
                address(stockTokenA),
                overExposure,
                1_000_000e18
            )
        );
        creditLine.depositCollateral(posId, address(stockTokenA), overExposure);
        vm.stopPrank();
    }

    /* =========================================================================
     * COLLATERAL WITHDRAWAL TESTS
     * ========================================================================= */

    function test_WithdrawCollateral_Success() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);

        vm.expectEmit(true, true, true, true);
        emit CollateralWithdrawn(posId, alice, address(stockTokenA), 40e18);

        creditLine.withdrawCollateral(posId, address(stockTokenA), 40e18);
        vm.stopPrank();

        assertEq(creditLine.collateralOf(posId, address(stockTokenA)), 60e18);
        assertEq(creditLine.totalDeposited(address(stockTokenA)), 60e18);
    }

    function test_WithdrawCollateral_RevertIf_InsufficientBalance() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 50e18);

        vm.expectRevert(
            abi.encodeWithSelector(
                InsufficientCollateralBalance.selector,
                address(stockTokenA),
                100e18,
                50e18
            )
        );
        creditLine.withdrawCollateral(posId, address(stockTokenA), 100e18);
        vm.stopPrank();
    }

    function test_WithdrawCollateral_RevertIf_NotOwner() public {
        vm.prank(alice);
        uint256 posId = creditLine.openPositionAndDeposit(
            address(stockTokenA),
            100e18
        );

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(NotPositionOwner.selector, posId, bob)
        );
        creditLine.withdrawCollateral(posId, address(stockTokenA), 50e18);
    }

    function test_WithdrawCollateral_RevertIf_PositionUnsafeAfterWithdrawal()
        public
    {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);

        riskEngine.setCreditLimit(posId, 10_000e18);
        creditLine.borrow(posId, 5_000e18);

        riskEngine.setRiskAdjustedValue(posId, 4_000e18);

        vm.expectRevert(PositionUnsafeAfterWithdrawal.selector);
        creditLine.withdrawCollateral(posId, address(stockTokenA), 50e18);
        vm.stopPrank();
    }

    /* =========================================================================
     * BORROW & REPAY TESTS
     * ========================================================================= */

    function test_Borrow_Success() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);

        riskEngine.setCreditLimit(posId, 10_000e18);

        vm.expectEmit(true, true, false, true);
        emit Borrowed(posId, alice, 5_000e18, 5_000e18, 5_000e18);

        creditLine.borrow(posId, 5_000e18);
        vm.stopPrank();

        assertEq(creditLine.debtShares(posId), 5_000e18);
        assertEq(creditLine.totalDebtShares(), 5_000e18);
    }

    function test_Borrow_RevertIf_NotPositionOwner() public {
        vm.prank(alice);
        uint256 posId = creditLine.openPositionAndDeposit(
            address(stockTokenA),
            100e18
        );

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(NotPositionOwner.selector, posId, bob)
        );
        creditLine.borrow(posId, 1_000e18);
    }

    function test_Borrow_RevertIf_ExceedsCreditLimit() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);

        riskEngine.setCreditLimit(posId, 5_000e18);

        vm.expectRevert(
            abi.encodeWithSelector(
                ExceedsCreditLimit.selector,
                6_000e18,
                5_000e18
            )
        );
        creditLine.borrow(posId, 6_000e18);
        vm.stopPrank();
    }

    function test_Repay_FullRepayment() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(posId, 10_000e18);
        creditLine.borrow(posId, 5_000e18);

        creditLine.repay(posId, 5_000e18);
        vm.stopPrank();

        assertEq(creditLine.debtShares(posId), 0);
        assertEq(creditLine.totalDebtShares(), 0);
    }

    function test_Repay_PartialRepayment() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(posId, 10_000e18);
        creditLine.borrow(posId, 5_000e18);

        creditLine.repay(posId, 2_000e18);
        vm.stopPrank();

        assertEq(creditLine.debtShares(posId), 3_000e18);
        assertEq(creditLine.totalDebtShares(), 3_000e18);
    }

    function test_Repay_RevertIf_NoActiveDebt() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();

        vm.expectRevert(abi.encodeWithSelector(NoActiveDebt.selector, posId));
        creditLine.repay(posId, 100e18);
        vm.stopPrank();
    }

    /* =========================================================================
     * LIQUIDATION TESTS
     * ========================================================================= */

    function test_Liquidate_Success() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18); // Value: $15,000
        riskEngine.setCreditLimit(posId, 10_000e18);
        creditLine.borrow(posId, 8_000e18);
        vm.stopPrank();

        riskEngine.setIsLiquidatable(posId, true);

        uint256 debtToCover = 4_000e18; // Repay 50%

        vm.prank(liquidator);
        creditLine.liquidate(posId, address(stockTokenA), debtToCover);

        assertEq(creditLine.debtShares(posId), 4_000e18);
        assertGt(stockTokenA.balanceOf(liquidator), 0);
    }

    function test_Liquidate_RevertIf_PositionNotLiquidatable() public {
        vm.startPrank(alice);
        uint256 posId = creditLine.openPosition();
        creditLine.depositCollateral(posId, address(stockTokenA), 100e18);
        riskEngine.setCreditLimit(posId, 10_000e18);
        creditLine.borrow(posId, 5_000e18);
        vm.stopPrank();

        riskEngine.setIsLiquidatable(posId, false);

        vm.prank(liquidator);
        vm.expectRevert(
            abi.encodeWithSelector(
                PositionNotLiquidatable.selector,
                posId,
                5_000e18
            )
        );
        creditLine.liquidate(posId, address(stockTokenA), 2_000e18);
    }

    /* =========================================================================
     * PAUSE CONTROL TESTS
     * ========================================================================= */

    function test_Pause_PreventsActions() public {
        vm.prank(alice);
        uint256 posId = creditLine.openPosition();

        vm.prank(admin);
        creditLine.pause();

        vm.startPrank(alice);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.depositCollateral(posId, address(stockTokenA), 10e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.withdrawCollateral(posId, address(stockTokenA), 10e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.borrow(posId, 100e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        creditLine.repay(posId, 100e18);
        vm.stopPrank();
    }
}
