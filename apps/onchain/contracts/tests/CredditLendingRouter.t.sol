// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {CredditLendingRouter, InvalidCreditLine, AdapterHasDebt, AdapterAssetMismatch, TooManyAdapters, InsufficientLiquidity, InsufficientAggregateLiquidity, AdapterUnderdelivered, AdapterOverRepaid, NothingToRepay} from "../core/CredditLendingRouter.sol";
import {ZeroAddressProvided, ZeroAmount} from "../core/CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockLendingAdapter} from "../mock/MockLendingAdapter.sol";

contract CredditLendingRouterTest is Test {
    CredditLendingRouter public router;
    CredditLendingRouter public routerImpl;

    MockERC20 public usdg;
    MockLendingAdapter public adapterA; // Cheap Adapter (e.g. 5% APR)
    MockLendingAdapter public adapterB; // Medium Adapter (e.g. 8% APR)
    MockLendingAdapter public adapterC; // Expensive Adapter (e.g. 12% APR)

    address public admin = address(0x111);
    address public creditLine = address(0x222);
    address public borrower = address(0x333);

    event CreditLineSet(address indexed creditLine);
    event AdapterSet(address indexed adapter, bool enabled);
    event LiquidityRouted(
        address indexed beneficiary,
        address indexed adapter,
        uint256 amount
    );
    event LiquidityRepaid(
        address indexed beneficiary,
        address indexed adapter,
        uint256 amount
    );

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy Loan Token
        usdg = new MockERC20("USD Stablecoin", "USDG", 6, admin);

        // 2. Deploy Router via deployCode
        address implAddr = deployCode(
            "CredditLendingRouter.sol:CredditLendingRouter"
        );
        routerImpl = CredditLendingRouter(implAddr);

        bytes memory initData = abi.encodeCall(
            CredditLendingRouter.initialize,
            (admin, address(usdg))
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(routerImpl), initData);
        router = CredditLendingRouter(address(proxy));

        // 3. Set Credit Line Role
        router.setCreditLine(creditLine);

        // 4. Deploy Adapters and seed liquidity
        adapterA = new MockLendingAdapter(address(usdg));
        adapterB = new MockLendingAdapter(address(usdg));
        adapterC = new MockLendingAdapter(address(usdg));

        usdg.mint(address(adapterA), 1_000_000e18);
        usdg.mint(address(adapterB), 1_000_000e18);
        usdg.mint(address(adapterC), 1_000_000e18);

        // Adapter A: Available = 50,000 | Rate = 500 BPS (5%) | Fee = 0
        adapterA.setMockParams(50_000e18, 500, 0, 0);
        // Adapter B: Available = 50,000 | Rate = 800 BPS (8%) | Fee = 0
        adapterB.setMockParams(50_000e18, 800, 0, 0);
        // Adapter C: Available = 50,000 | Rate = 1200 BPS (12%) | Fee = 0
        adapterC.setMockParams(50_000e18, 1200, 0, 0);

        // Register Adapters
        router.setAdapter(address(adapterA), true);
        router.setAdapter(address(adapterB), true);
        router.setAdapter(address(adapterC), true);

        vm.stopPrank();
    }

    /* =========================================================================
     * INITIALIZATION & ADMIN TESTS
     * ========================================================================= */

    function test_Initialize_Success() public view {
        assertEq(address(router.usdg()), address(usdg));
        assertEq(router.creditLine(), creditLine);
        assertTrue(router.hasRole(CredditRoles.ADAPTER_ADMIN_ROLE, admin));
        assertTrue(router.hasRole(CredditRoles.CREDIT_LINE_ROLE, creditLine));
    }

    function test_Initialize_RevertIf_ZeroAddress() public {
        address implAddr = deployCode(
            "CredditLendingRouter.sol:CredditLendingRouter"
        );
        CredditLendingRouter impl = CredditLendingRouter(implAddr);

        // Zero Admin
        bytes memory data = abi.encodeCall(
            CredditLendingRouter.initialize,
            (address(0), address(usdg))
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), data);

        // Zero USDG
        data = abi.encodeCall(
            CredditLendingRouter.initialize,
            (admin, address(0))
        );
        vm.expectRevert(ZeroAddressProvided.selector);
        new ERC1967Proxy(address(impl), data);
    }

    function test_SetCreditLine_Success() public {
        address nextCreditLine = address(0x999);

        vm.expectEmit(true, false, false, false);
        emit CreditLineSet(nextCreditLine);

        vm.prank(admin);
        router.setCreditLine(nextCreditLine);

        assertEq(router.creditLine(), nextCreditLine);
        assertTrue(
            router.hasRole(CredditRoles.CREDIT_LINE_ROLE, nextCreditLine)
        );
        assertFalse(router.hasRole(CredditRoles.CREDIT_LINE_ROLE, creditLine));
    }

    function test_SetCreditLine_RevertIf_AdapterHasDebt() public {
        // Create outstanding debt
        vm.prank(creditLine);
        router.borrow(borrower, 10_000e18);

        address nextCreditLine = address(0x999);
        vm.prank(admin);
        vm.expectRevert(AdapterHasDebt.selector);
        router.setCreditLine(nextCreditLine);
    }

    function test_SetAdapter_RevertIf_AssetMismatch() public {
        MockERC20 badToken = new MockERC20("Bad", "BAD", 6, admin);
        MockLendingAdapter badAdapter = new MockLendingAdapter(
            address(badToken)
        );

        vm.prank(admin);
        vm.expectRevert(AdapterAssetMismatch.selector);
        router.setAdapter(address(badAdapter), true);
    }

    function test_SetAdapter_RevertIf_TooManyAdapters() public {
        vm.startPrank(admin);
        // Fill up to MAX_ADAPTERS (8)
        for (uint256 i = 0; i < 5; i++) {
            MockLendingAdapter m = new MockLendingAdapter(address(usdg));
            router.setAdapter(address(m), true);
        }

        MockLendingAdapter overflowAdapter = new MockLendingAdapter(
            address(usdg)
        );
        vm.expectRevert(TooManyAdapters.selector);
        router.setAdapter(address(overflowAdapter), true);
        vm.stopPrank();
    }

    function test_DisableAdapter_RevertIf_HasDebt() public {
        vm.prank(creditLine);
        router.borrow(borrower, 10_000e18); // Borrowed from adapterA

        vm.prank(admin);
        vm.expectRevert(AdapterHasDebt.selector);
        router.setAdapter(address(adapterA), false);
    }

    /* =========================================================================
     * QUOTE & GREEDY ALLOCATION TESTS
     * ========================================================================= */

    function test_Quote_SingleCheapestAdapter() public view {
        // Request 30,000 e18 -> Fits entirely in Adapter A (50,000 available @ 5% APR)
        (
            CredditLendingRouter.Allocation[] memory allocs,
            uint256 filled,
            uint256 blendedRateWad,
            uint256 totalFeeWad
        ) = router.quote(30_000e18);

        assertEq(filled, 30_000e18);
        assertEq(allocs.length, 1);
        assertEq(allocs[0].adapter, address(adapterA));
        assertEq(allocs[0].amount, 30_000e18);
        assertEq(blendedRateWad, 0.05e18); // 500 bps converted to WAD
        assertEq(totalFeeWad, 0);
    }

    function test_Quote_SplitsAcrossMultipleAdapters() public view {
        // Request 80,000 e18 -> Takes 50,000 from A (5%) + 30,000 from B (8%)
        (
            CredditLendingRouter.Allocation[] memory allocs,
            uint256 filled,
            uint256 blendedRateWad,

        ) = router.quote(80_000e18);

        assertEq(filled, 80_000e18);
        assertEq(allocs.length, 2);

        // Order 1: Adapter A (50,000)
        assertEq(allocs[0].adapter, address(adapterA));
        assertEq(allocs[0].amount, 50_000e18);

        // Order 2: Adapter B (30,000)
        assertEq(allocs[1].adapter, address(adapterB));
        assertEq(allocs[1].amount, 30_000e18);

        // Blended Rate = (50,000 * 0.05 + 30,000 * 0.08) / 80,000 = (2,500 + 2,400) / 80,000 = 0.06125e18 (6.125%)
        assertEq(blendedRateWad, 0.06125e18);
    }

    function test_Quote_RevertIf_InsufficientAggregateLiquidity() public {
        // Total available across A+B+C = 150,000 e18. Request 150,001 e18
        vm.expectRevert(InsufficientLiquidity.selector);
        router.quote(150_001e18);
    }

    /* =========================================================================
     * BORROW & REPAY FLOW TESTS
     * ========================================================================= */

    function test_Borrow_ExecutesCheapestFirst() public {
        uint256 borrowAmount = 70_000e18;

        vm.expectEmit(true, true, false, true);
        emit LiquidityRouted(borrower, address(adapterA), 50_000e18);

        vm.expectEmit(true, true, false, true);
        emit LiquidityRouted(borrower, address(adapterB), 20_000e18);

        vm.prank(creditLine);
        (uint256 totalReceived, uint256 weightedAprBps) = router.borrow(
            borrower,
            borrowAmount
        );

        assertEq(totalReceived, borrowAmount);
        assertEq(usdg.balanceOf(borrower), borrowAmount);
        assertEq(router.borrowedFrom(borrower, address(adapterA)), 50_000e18);
        assertEq(router.borrowedFrom(borrower, address(adapterB)), 20_000e18);
        assertEq(router.borrowedFrom(borrower, address(adapterC)), 0);

        // Weighted APR: (50000*500 + 20000*800)/70000 = 585.71 BPS -> Rounds UP via wadMulUp to 586 BPS
        assertEq(weightedAprBps, 586);
    }

    function test_Borrow_RevertIf_NotCreditLine() public {
        vm.prank(borrower);
        vm.expectRevert();
        router.borrow(borrower, 10_000e18);
    }

    function test_Borrow_RevertIf_Underdelivered() public {
        // Configure Adapter A to underdeliver by 1e18
        adapterA.setFailureFlags(1e18, 0, false, false);

        vm.prank(creditLine);
        vm.expectRevert(
            abi.encodeWithSelector(
                AdapterUnderdelivered.selector,
                address(adapterA),
                10_000e18,
                9_999e18
            )
        );
        router.borrow(borrower, 10_000e18);
    }

    function test_Repay_UnwindsDebtInChronologicalOrder() public {
        // 1. Borrow 70,000 (50k from A, 20k from B)
        vm.prank(creditLine);
        router.borrow(borrower, 70_000e18);

        // 2. Fund credit line for repayment
        usdg.mint(creditLine, 70_000e18);

        vm.startPrank(creditLine);
        usdg.approve(address(router), type(uint256).max);

        // Repay 60,000 (Wipes out 50k on A, and 10k on B)
        vm.expectEmit(true, true, false, true);
        emit LiquidityRepaid(borrower, address(adapterA), 50_000e18);

        vm.expectEmit(true, true, false, true);
        emit LiquidityRepaid(borrower, address(adapterB), 10_000e18);

        uint256 totalPaid = router.repay(borrower, 60_000e18);

        assertEq(totalPaid, 60_000e18);
        assertEq(router.borrowedFrom(borrower, address(adapterA)), 0);
        assertEq(router.borrowedFrom(borrower, address(adapterB)), 10_000e18);

        vm.stopPrank();
    }

    function test_Repay_RevertIf_NothingToRepay() public {
        usdg.mint(creditLine, 10_000e18);

        vm.startPrank(creditLine);
        usdg.approve(address(router), type(uint256).max);

        vm.expectRevert(
            abi.encodeWithSelector(NothingToRepay.selector, borrower)
        );
        router.repay(borrower, 10_000e18);

        vm.stopPrank();
    }

    function test_Repay_RevertIf_AdapterOverRepaid() public {
        vm.prank(creditLine);
        router.borrow(borrower, 10_000e18);

        // Configure Adapter A to report over-repayment
        adapterA.setFailureFlags(0, 1e18, false, false);

        usdg.mint(creditLine, 10_000e18);
        vm.startPrank(creditLine);
        usdg.approve(address(router), type(uint256).max);

        vm.expectRevert(
            abi.encodeWithSelector(
                AdapterOverRepaid.selector,
                address(adapterA),
                10_000e18,
                10_001e18
            )
        );
        router.repay(borrower, 10_000e18);
        vm.stopPrank();
    }

    /* =========================================================================
     * EDGE CASES & FAULTY ADAPTER PROTECTION
     * ========================================================================= */

    function test_Probe_IgnoresFailingOrRevertingAdapters() public {
        // Healthy adapter: Ensure feeWad is <= test borrow amount!
        adapterA.setMockParams(
            1000e18, // available liquidity
            500, // 5% rate (500 bps)
            0, // mockFeeWad MUST be 0 or <= borrow amount
            0 // current debt
        );

        // Configure Adapter A to revert on quote
        adapterB.setFailureFlags(0, 0, true, false);

        // Router should bypass failing Adapter A and use Adapter B instead
        (
            CredditLendingRouter.Allocation[] memory allocs,
            uint256 filled,
            ,

        ) = router.quote(500e18);

        assertEq(filled, 500e18);
        assertEq(allocs.length, 1);
        assertEq(allocs[0].adapter, address(adapterA));
    }

    function test_Probe_RejectsExcessiveRatesAndFees() public {
        // Configure Adapter A to quote rate above MAX_RATE_BPS (1_000_000 BPS)
        adapterA.setMockParams(50_000e18, 1_000_001, 0, 0);

        // Router bypasses Adapter A due to invalid rate quote
        (
            CredditLendingRouter.Allocation[] memory allocs,
            uint256 filled,
            ,

        ) = router.quote(30_000e18);

        assertEq(filled, 30_000e18);
        assertEq(allocs[0].adapter, address(adapterB));
    }
}
