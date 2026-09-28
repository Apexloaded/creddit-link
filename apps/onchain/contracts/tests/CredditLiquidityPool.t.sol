// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import {CredditLiquidityPool, InsufficientLiquidity} from "../core/CredditLiquidityPool.sol";
import {CredditInterestRateModel} from "../core/CredditInterestRateModel.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "../core/CredditErrors.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {CredditTreasury} from "../core/CredditTreasury.sol";

contract CredditLiquidityPoolTest is Test {
    CredditLiquidityPool public pool;
    CredditLiquidityPool public poolImpl;
    CredditInterestRateModel public rateModel;
    CredditInterestRateModel public rateModelImpl;
    MockERC20 public assetToken;
    CredditTreasury public treasury;

    address public admin = address(0x1);
    address public router = address(0x2);
    address public alice = address(0x3);
    address public bob = address(0x4);

    uint256 constant INITIAL_DEPOSIT = 100_000e18;

    event OriginationFeeUpdated(uint256 newFee);
    event RateModelUpdated(address indexed newRateModel);
    event InterestAccrued(
        uint256 interestAccrued,
        uint256 newTotalBorrows,
        uint256 timestamp
    );

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy Asset Token
        assetToken = new MockERC20("USD Stablecoin", "USDG", 6, admin);

        // 2. Deploy Interest Rate Model
        rateModelImpl = new CredditInterestRateModel();
        CredditInterestRateModel.Params
            memory irParams = CredditInterestRateModel.Params({
                baseRateWad: 0.02e18, // 2% Base
                kinkWad: 0.80e18, // 80% Kink
                slope1Wad: 0.10e18, // 10% Slope1
                slope2Wad: 1.00e18 // 100% Slope2
            });

        bytes memory irInitData = abi.encodeCall(
            CredditInterestRateModel.initialize,
            (admin, irParams)
        );
        ERC1967Proxy irProxy = new ERC1967Proxy(
            address(rateModelImpl),
            irInitData
        );
        rateModel = CredditInterestRateModel(address(irProxy));

        // 3. Deploy Liquidity Pool
        poolImpl = new CredditLiquidityPool();
        bytes memory poolInitData = abi.encodeCall(
            CredditLiquidityPool.initialize,
            (
                address(assetToken),
                "Creddit Vault USDG",
                "cUSDG",
                admin,
                address(rateModel),
                payable(treasury)
            )
        );
        ERC1967Proxy poolProxy = new ERC1967Proxy(
            address(poolImpl),
            poolInitData
        );
        pool = CredditLiquidityPool(address(poolProxy));

        // 4. Configure Roles
        pool.setRouter(router);

        vm.stopPrank();

        // 5. Mint tokens to users
        assetToken.mint(alice, 1_000_000e18);
        assetToken.mint(bob, 1_000_000e18);

        vm.prank(alice);
        assetToken.approve(address(pool), type(uint256).max);

        vm.prank(bob);
        assetToken.approve(address(pool), type(uint256).max);
    }

    /* =========================================================================
     * INITIALIZATION TESTS
     ======================================================================== */

    function test_Initialize_Success() public view {
        assertEq(pool.asset(), address(assetToken));
        assertEq(pool.loanToken(), address(assetToken));
        assertEq(pool.name(), "Creddit Vault USDG");
        assertEq(pool.symbol(), "cUSDG");
        assertEq(address(pool.rateModel()), address(rateModel));
        assertEq(pool.hasRole(CredditRoles.POOL_ADMIN_ROLE, admin), true);
        assertEq(pool.hasRole(CredditRoles.ROUTER_ROLE, router), true);
    }

    function test_Initialize_RevertIf_ZeroAddress() public {
        bytes memory initData = abi.encodeCall(
            CredditLiquidityPool.initialize,
            (
                address(0),
                "Creddit Vault USDG",
                "cUSDG",
                admin,
                address(rateModel),
                payable(treasury)
            )
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(poolImpl), initData);
    }

    /* =========================================================================
     * ERC4626 VAULT OPERATIONS
     ======================================================================== */

    function test_DepositAndWithdraw() public {
        vm.startPrank(alice);
        uint256 shares = pool.deposit(INITIAL_DEPOSIT, alice);
        assertEq(shares, INITIAL_DEPOSIT);
        assertEq(pool.balanceOf(alice), INITIAL_DEPOSIT);
        assertEq(pool.totalAssets(), INITIAL_DEPOSIT);
        assertEq(pool.availableLiquidity(), INITIAL_DEPOSIT);

        uint256 assetsWithdrawn = pool.withdraw(INITIAL_DEPOSIT, alice, alice);
        assertEq(assetsWithdrawn, INITIAL_DEPOSIT);
        assertEq(pool.balanceOf(alice), 0);
        assertEq(pool.totalAssets(), 0);
        vm.stopPrank();
    }

    /* =========================================================================
     * BORROW & REPAY TESTS
     ======================================================================== */

    function test_Borrow_Success() public {
        // Deposit liquidity
        vm.prank(alice);
        pool.deposit(INITIAL_DEPOSIT, alice);

        uint256 borrowAmount = 20_000e18;

        vm.prank(router);
        uint256 received = pool.borrow(bob, borrowAmount);

        assertEq(received, borrowAmount);
        assertEq(assetToken.balanceOf(bob), 1_020_000e18);
        assertEq(pool.totalBorrows(), borrowAmount);
        assertEq(pool.availableLiquidity(), INITIAL_DEPOSIT - borrowAmount);
    }

    function test_Borrow_WithOriginationFee() public {
        vm.prank(admin);
        pool.setOriginationFee(100e18);

        vm.prank(alice);
        pool.deposit(INITIAL_DEPOSIT, alice);

        uint256 borrowAmount = 1_000e18;

        vm.prank(router);
        uint256 received = pool.borrow(bob, borrowAmount);

        // 1000 total borrow, 100 fee retained in pool -> 900 received
        assertEq(received, 900e18);
        assertEq(pool.totalBorrows(), borrowAmount); // Debt remains 1000
    }

    function test_Borrow_RevertIf_InsufficientLiquidity() public {
        vm.prank(alice);
        pool.deposit(10_000e18, alice);

        vm.prank(router);
        vm.expectRevert(InsufficientLiquidity.selector);
        pool.borrow(bob, 20_000e18);
    }

    function test_Borrow_RevertIf_NotRouter() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                alice,
                CredditRoles.ROUTER_ROLE
            )
        );
        pool.borrow(bob, 1_000e18);
    }

    function test_Repay_Success() public {
        vm.prank(alice);
        pool.deposit(INITIAL_DEPOSIT, alice);

        vm.prank(router);
        pool.borrow(bob, 50_000e18);

        // Approve pool to spend router funds for repayment
        vm.prank(router);
        assetToken.approve(address(pool), type(uint256).max);

        // Fund router
        assetToken.mint(router, 50_000e18);

        vm.prank(router);
        uint256 repaid = pool.repay(router, 30_000e18);

        assertEq(repaid, 30_000e18);
        assertEq(pool.totalBorrows(), 20_000e18);
    }

    function test_Repay_CappedAtTotalDebt() public {
        vm.prank(alice);
        pool.deposit(INITIAL_DEPOSIT, alice);

        vm.prank(router);
        pool.borrow(bob, 10_000e18);

        assetToken.mint(router, 50_000e18);
        vm.startPrank(router);
        assetToken.approve(address(pool), type(uint256).max);

        // Repay more than total borrows
        uint256 repaid = pool.repay(router, 20_000e18);

        assertEq(repaid, 10_000e18);
        assertEq(pool.totalBorrows(), 0);
        vm.stopPrank();
    }

    /* =========================================================================
     * INTEREST ACCRUAL TESTS
     ======================================================================== */

    function test_InterestAccrual_OverTime() public {
        vm.prank(alice);
        pool.deposit(100_000e18, alice);

        // Borrow 50,000 (50% utilization -> Base 2% + 50%*10% = 7% APR)
        vm.prank(router);
        pool.borrow(bob, 50_000e18);

        uint256 initialDebt = pool.currentDebt();
        assertEq(initialDebt, 50_000e18);

        // Warp 1 year (365 days)
        vm.warp(block.timestamp + 365 days);

        // Preview debt: 50,000 * 7% = 3,500 interest accrued
        uint256 debtAfterYear = pool.currentDebt();
        assertApproxEqAbs(debtAfterYear, 53_500e18, 1e16);

        // Trigger on-chain accrual via zero-repay or setRateModel
        vm.prank(admin);
        pool.setRateModel(address(rateModel));

        assertEq(pool.lastAccrualTimestamp(), block.timestamp);
        assertApproxEqAbs(pool.totalBorrows(), 53_500e18, 1e16);
    }

    /* =========================================================================
     * ADMIN & CONTROL TESTS
     ======================================================================== */

    function test_SetOriginationFee() public {
        vm.expectEmit(true, true, true, true);
        emit OriginationFeeUpdated(50e18);

        vm.prank(admin);
        pool.setOriginationFee(50e18);

        assertEq(pool.originationFee(), 50e18);
    }

    function test_SetRateModel_AccruesInterestFirst() public {
        vm.prank(alice);
        pool.deposit(100_000e18, alice);

        vm.prank(router);
        pool.borrow(bob, 50_000e18);

        vm.warp(block.timestamp + 180 days);

        // Deploy new rate model
        CredditInterestRateModel newModel = new CredditInterestRateModel();

        vm.expectEmit(true, true, true, true);
        emit RateModelUpdated(address(newModel));

        vm.prank(admin);
        pool.setRateModel(address(newModel));

        assertEq(address(pool.rateModel()), address(newModel));
        assertEq(pool.lastAccrualTimestamp(), block.timestamp);
    }

    function test_Pause_PreventsBorrowAndRepay() public {
        vm.prank(admin);
        pool.pause();

        vm.prank(alice);
        pool.deposit(INITIAL_DEPOSIT, alice);

        vm.startPrank(router);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        pool.borrow(bob, 1_000e18);

        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        pool.repay(router, 1_000e18);
        vm.stopPrank();
    }
}
