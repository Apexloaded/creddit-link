// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {CredditCore} from "./CredditCore.sol";
import {ZeroAddressProvided, ZeroAmount} from "./CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";
import {WadMath} from "../libraries/WadMath.sol";

/// @notice Custom Errors for the CredditLendingRouter contract
error InvalidCreditLine();
error AdapterHasDebt();
error AdapterAssetMismatch();
error TooManyAdapters();
error InsufficientLiquidity();
error AmountTooLarge();
error InsufficientAggregateLiquidity(
    uint256 requestedAmount,
    uint256 totalAvailable
);
error AdapterUnderdelivered(
    address adapter,
    uint256 requested,
    uint256 received
);
error AdapterOverRepaid(address adapter, uint256 requested, uint256 repaid);
error NothingToRepay(address beneficiary);

/// @title CredditLendingRouter
/// @notice Cross-protocol capital abstraction. Splits a single borrow/repay
/// request across every enabled lending pool via adapters, cheapest source first,
/// and tracks per-borrower, per-adapter balances so repayment can unwind the same
/// allocation correctly.
contract CredditLendingRouter is CredditCore {
    using SafeERC20 for IERC20;
    using WadMath for uint256;

    /// @dev Maximum number of adapters supported.
    uint256 public constant MAX_ADAPTERS = 8;

    /// @dev The maximum rate an adapter may report (bps). 1_000_000 bps = 10,000%.
    uint256 public constant MAX_RATE_BPS = 1_000_000;

    /// @dev MAX_RATE_BPS expressed in WAD (1e18 = 100%). Must stay in sync with MAX_RATE_BPS;
    /// it also drives the overflow guard on `amount` in `_quote`.
    uint256 public constant MAX_RATE_WAD = 100e18;

    /// @dev The gas limit for adapter view calls.
    uint256 public constant ADAPTER_CALL_GAS = 200_000;

    /// @dev The USDG token contract.
    IERC20 public usdg;

    /// @notice Adapter information.
    /// @param enabled Whether the adapter is enabled.
    /// @param registered Whether the adapter is registered.
    /// @param index The 1-based position of the adapter in the _adapters array.
    struct AdapterInfo {
        bool enabled;
        bool registered;
        uint256 index;
    }

    /// @notice Allocation information.
    /// @param adapter The address of the adapter.
    /// @param amount The amount of the adapter.
    struct Allocation {
        address adapter;
        uint256 amount;
    }

    /// @notice Candidate adapter information.
    /// @param adapter The address of the adapter.
    /// @param available The available liquidity in the adapter.
    /// @param probed The slice size the adapter was quoted for.
    /// @param effectiveRateWad Base rate plus fee as a WAD fraction of the probed slice.
    /// @param baseRateWad The base rate in WAD.
    /// @param feeWad The absolute fee (loan-token units) quoted for the probed slice.
    struct Candidate {
        address adapter;
        uint256 available;
        uint256 probed;
        uint256 effectiveRateWad;
        uint256 baseRateWad;
        uint256 feeWad;
    }

    /// @notice Emitted when the credit line contract is set.
    /// @param creditLine The address of the credit line contract.
    event CreditLineSet(address indexed creditLine);

    /// @notice Emitted when an adapter is set.
    /// @param adapter The address of the adapter.
    /// @param enabled Whether the adapter is enabled.
    event AdapterSet(address indexed adapter, bool enabled);

    /// @notice Emitted when liquidity is routed to an adapter.
    /// @param beneficiary The address of the beneficiary.
    /// @param adapter The address of the adapter.
    /// @param amount The amount of liquidity routed to the adapter.
    event LiquidityRouted(
        address indexed beneficiary,
        address indexed adapter,
        uint256 amount
    );

    /// @notice Emitted when liquidity is repaid to an adapter.
    /// @param beneficiary The address of the beneficiary.
    /// @param adapter The address of the adapter.
    /// @param amount The amount of liquidity repaid to the adapter.
    event LiquidityRepaid(
        address indexed beneficiary,
        address indexed adapter,
        uint256 amount
    );

    /// @notice Mapping from adapter address to its information.
    mapping(address => AdapterInfo) public adapters;

    /// @notice Principal borrowed by a beneficiary from each adapter.
    mapping(address => mapping(address => uint256)) public borrowedFrom;

    /// @notice Mapping from beneficiary address to the adapters it currently owes.
    mapping(address => address[]) internal _beneficiaryAdapters;

    /// @notice Membership flag for `_beneficiaryAdapters`.
    mapping(address => mapping(address => bool))
        internal _hasBeneficiaryAdapter;

    /// @dev Array of all adapters in the router.
    ILendingAdapter[] internal _adapters;

    /// @notice The credit line contract.
    address public creditLine;

    /// @notice Initializes the CredditLendingRouter contract.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param _usdg The loan token shared by every adapter.
    function initialize(address admin, address _usdg) external initializer {
        if (admin == address(0) || _usdg == address(0))
            revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant roles to admin
        _grantRole(CredditRoles.ADAPTER_ADMIN_ROLE, admin);

        // Initialize callable contracts
        usdg = IERC20(_usdg);
    }

    /*********************************************************************
     * ADMIN WRITE FUNCTIONS
     *********************************************************************/

    /// @notice Sets the credit line contract.
    /// @param next The address of the credit line contract.
    function setCreditLine(address next) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (next == address(0)) revert InvalidCreditLine();
        if (creditLine != address(0)) {
            if (currentTotalDebt() != 0) revert AdapterHasDebt();
            _revokeRole(CredditRoles.CREDIT_LINE_ROLE, creditLine);
        }
        creditLine = next;
        _grantRole(CredditRoles.CREDIT_LINE_ROLE, next);
        emit CreditLineSet(next);
    }

    /// @notice Sets an adapter to be enabled or disabled.
    /// @dev Disabling is deliberately allowed while paused and does not depend on the
    /// adapter answering: a broken or hostile adapter must always be removable from routing.
    /// If its debt view fails, the adapter is treated as having no verifiable debt.
    /// Borrowers can still repay a disabled adapter (`repay` does not check `enabled`).
    /// @param adapter The address of the adapter to set.
    /// @param isEnabled Whether the adapter should be enabled.
    function setAdapter(
        address adapter,
        bool isEnabled
    ) external onlyRole(CredditRoles.ADAPTER_ADMIN_ROLE) {
        if (adapter == address(0)) revert ZeroAddressProvided();

        if (!isEnabled) {
            if (adapters[adapter].enabled) {
                (bool ok, uint256 debt, ) = _probe(
                    adapter,
                    abi.encodeCall(ILendingAdapter.currentDebt, ()),
                    1
                );
                if (ok && debt != 0) revert AdapterHasDebt();
            }
        } else if (!adapters[adapter].enabled) {
            _requireNotPaused();
            if (!adapters[adapter].registered) {
                if (_adapters.length >= MAX_ADAPTERS) revert TooManyAdapters();
                if (ILendingAdapter(adapter).loanToken() != address(usdg))
                    revert AdapterAssetMismatch();
                _adapters.push(ILendingAdapter(adapter));
                adapters[adapter].index = _adapters.length;
                adapters[adapter].registered = true;
            }
        }

        adapters[adapter].enabled = isEnabled;
        emit AdapterSet(adapter, isEnabled);
    }

    /*********************************************************************
     * EXTERNAL WRITE FUNCTIONS
     *********************************************************************/

    /// @notice Borrows `amount` for `beneficiary`, routed cheapest-first across adapters.
    /// @return totalReceived Sum of the amounts adapters report as delivered.
    /// @return weightedAprBps Blended base rate plus fees as a fraction of principal, in bps.
    function borrow(
        address beneficiary,
        uint256 amount
    )
        external
        onlyRole(CredditRoles.CREDIT_LINE_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 totalReceived, uint256 weightedAprBps)
    {
        if (amount == 0) revert ZeroAmount();
        if (beneficiary == address(0)) revert ZeroAddressProvided();

        (
            Allocation[] memory allocations,
            uint256 filled,
            uint256 blendedRateWad,
            uint256 totalFeeWad
        ) = _quote(amount);
        if (filled != amount)
            revert InsufficientAggregateLiquidity(amount, filled);

        weightedAprBps = _toAprBps(blendedRateWad, totalFeeWad, filled);

        uint256 len = allocations.length;
        for (uint256 i = 0; i < len; ++i) {
            address adapterAddr = allocations[i].adapter;
            uint256 slice = allocations[i].amount;
            if (slice == 0) continue;

            // Effects before interaction
            if (!_hasBeneficiaryAdapter[beneficiary][adapterAddr]) {
                _hasBeneficiaryAdapter[beneficiary][adapterAddr] = true;
                _beneficiaryAdapters[beneficiary].push(adapterAddr);
            }
            borrowedFrom[beneficiary][adapterAddr] += slice;

            // Not caught: any failure must revert the whole transaction
            // (atomic delivery of the full amount).
            uint256 received = ILendingAdapter(adapterAddr).borrow(
                beneficiary,
                slice
            );
            // If fees are charged on top of principal, tighten to `received != slice`.
            if (received == 0)
                revert AdapterUnderdelivered(adapterAddr, slice, received);

            totalReceived += received;
            emit LiquidityRouted(beneficiary, adapterAddr, slice);
        }
    }

    /// @notice Repays up to `amount` of `beneficiary`'s debt, oldest adapter first.
    /// @dev Pulls only what is applied from msg.sender. Not gated by pause so borrowers
    /// can always reduce debt. Repays principal tracked in `borrowedFrom`.
    /// @return totalPaid The amount actually applied (<= amount).
    function repay(
        address beneficiary,
        uint256 amount
    )
        external
        onlyRole(CredditRoles.CREDIT_LINE_ROLE)
        nonReentrant
        returns (uint256 totalPaid)
    {
        if (amount == 0) revert ZeroAmount();
        if (beneficiary == address(0)) revert ZeroAddressProvided();

        // Memory snapshot: removals from the storage array below don't disturb iteration.
        address[] memory list = _beneficiaryAdapters[beneficiary];
        uint256 remaining = amount;

        for (uint256 i = 0; i < list.length && remaining > 0; ++i) {
            address adapterAddr = list[i];
            uint256 owed = borrowedFrom[beneficiary][adapterAddr];
            if (owed == 0) continue;

            uint256 slice = owed < remaining ? owed : remaining;

            usdg.safeTransferFrom(msg.sender, address(this), slice);
            usdg.forceApprove(adapterAddr, slice);
            // The router is the payer: the adapter pulls `slice` from this contract.
            // Not caught: a failing adapter must revert the whole repayment.
            uint256 repaid = ILendingAdapter(adapterAddr).repay(
                address(this),
                slice
            );
            usdg.forceApprove(adapterAddr, 0);

            if (repaid > slice)
                revert AdapterOverRepaid(adapterAddr, slice, repaid);
            if (repaid < slice) usdg.safeTransfer(msg.sender, slice - repaid);
            if (repaid == 0) continue;

            // repaid <= slice <= owed, so this cannot underflow
            uint256 newOwed = owed - repaid;
            borrowedFrom[beneficiary][adapterAddr] = newOwed;
            if (newOwed == 0)
                _removeBeneficiaryAdapter(beneficiary, adapterAddr);

            totalPaid += repaid;
            remaining -= repaid;

            emit LiquidityRepaid(beneficiary, adapterAddr, repaid);
        }

        if (totalPaid == 0) revert NothingToRepay(beneficiary);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Quotes the best allocation of a loan across adapters. Advisory only.
    function quote(
        uint256 amount
    )
        external
        view
        returns (
            Allocation[] memory allocations,
            uint256 filled,
            uint256 blendedRateWad,
            uint256 totalFeeWad
        )
    {
        return _quote(amount);
    }

    /// @notice Returns the number of adapters in the router.
    /// @return The number of adapters in the router.
    function adapterCount() external view returns (uint256) {
        return _adapters.length;
    }

    /// @notice Returns the total debt in the router.
    /// @return total The total debt in the router.
    function currentTotalDebt() public view returns (uint256 total) {
        for (uint256 i; i < _adapters.length; ++i) {
            address adapter = address(_adapters[i]);
            if (!adapters[adapter].enabled) continue;
            total += _adapters[i].currentDebt();
        }
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/

    /// @notice Quotes the best allocation of a loan across adapters.
    /// @param amount The amount of loan to quote.
    /// @return allocations An array of allocations.
    /// @return filled The total amount of loan filled (always == amount; reverts otherwise).
    /// @return blendedRateWad The principal-weighted base rate (WAD). Fees are separate.
    /// @return totalFeeWad The total absolute fee in loan-token units.
    function _quote(
        uint256 amount
    )
        internal
        view
        returns (
            Allocation[] memory allocations,
            uint256 filled,
            uint256 blendedRateWad,
            uint256 totalFeeWad
        )
    {
        if (amount == 0) revert ZeroAmount();
        // Guarantees take * rateWad in the weighted sum can never overflow
        if (amount > type(uint256).max / MAX_RATE_WAD) revert AmountTooLarge();

        (
            Candidate[] memory candidates,
            uint256 candidateCount
        ) = _collectCandidates(amount);
        if (candidateCount == 0) revert InsufficientLiquidity();

        _sortByEffectiveRate(candidates, candidateCount);

        // Greedy fill, cheapest first
        allocations = new Allocation[](candidateCount);
        uint256 count;
        uint256 remaining = amount;
        uint256 weightedRateSum;

        for (uint256 i = 0; i < candidateCount && remaining > 0; i++) {
            Candidate memory c = candidates[i];
            uint256 take = c.available < remaining ? c.available : remaining;

            uint256 rateWad = c.baseRateWad;
            uint256 feeWad = c.feeWad;

            // Re-quote only if this slice differs from the probed slice
            if (take != c.probed) {
                bool ok;
                (ok, rateWad, feeWad) = _quoteSlice(c.adapter, take);
                if (!ok) continue;
            }

            allocations[count++] = Allocation({
                adapter: c.adapter,
                amount: take
            });

            // No overflow: take <= amount <= max / MAX_RATE_WAD, rateWad <= MAX_RATE_WAD,
            // and sum(take) <= amount, so the running sum stays bounded.
            weightedRateSum += take * rateWad;
            totalFeeWad += feeWad; // sum(feeWad) <= sum(take) <= amount
            filled += take;
            remaining -= take;
        }

        // Enforce full fill (remove if partial fills are acceptable)
        if (remaining != 0) revert InsufficientLiquidity();

        // Shrink the array to the slots actually used
        assembly ("memory-safe") {
            mstore(allocations, count)
        }

        // filled == amount > 0 here
        blendedRateWad = weightedRateSum / filled;
    }

    /// @dev Probes every enabled adapter once. Never reverts on adapter misbehaviour.
    function _collectCandidates(
        uint256 amount
    ) private view returns (Candidate[] memory candidates, uint256 count) {
        uint256 n = _adapters.length;
        candidates = new Candidate[](n);

        for (uint256 i = 0; i < n; i++) {
            address adapterAddr = address(_adapters[i]);
            if (!adapters[adapterAddr].enabled) continue;

            (bool ok, uint256 liquidity, ) = _probe(
                adapterAddr,
                abi.encodeCall(ILendingAdapter.availableLiquidity, ()),
                1
            );
            if (!ok || liquidity == 0) continue;

            uint256 take = liquidity < amount ? liquidity : amount;

            uint256 rateWad;
            uint256 feeWad;
            (ok, rateWad, feeWad) = _quoteSlice(adapterAddr, take);
            if (!ok) continue;

            candidates[count++] = Candidate({
                adapter: adapterAddr,
                available: liquidity,
                probed: take,
                // no overflow: feeWad <= take, and take > 0 here
                effectiveRateWad: rateWad + feeWad.wadDivUp(take),
                baseRateWad: rateWad,
                feeWad: feeWad
            });
        }
    }

    /// @dev Quotes one slice from an adapter and validates it. The adapter reports the
    /// rate in bps; it is converted to WAD here. ok=false on any failure or malformed quote.
    function _quoteSlice(
        address adapter,
        uint256 take
    ) private view returns (bool ok, uint256 rateWad, uint256 feeWad) {
        uint256 rateBps;
        (ok, rateBps, feeWad) = _probe(
            adapter,
            abi.encodeCall(ILendingAdapter.quoteBorrow, (take)),
            2
        );
        // Reject absurd rates and fees exceeding the borrowed slice
        if (!ok || rateBps > MAX_RATE_BPS || feeWad > take)
            return (false, 0, 0);
        rateWad = WadMath.bpsToWad(rateBps);
    }

    /// @dev Insertion sort (stable) by effectiveRateWad ascending.
    function _sortByEffectiveRate(
        Candidate[] memory c,
        uint256 count
    ) private pure {
        for (uint256 i = 1; i < count; i++) {
            Candidate memory key = c[i];
            uint256 j = i;
            while (j > 0 && c[j - 1].effectiveRateWad > key.effectiveRateWad) {
                c[j] = c[j - 1];
                j--;
            }
            c[j] = key;
        }
    }

    /// @dev (base rate + fee/principal) in WAD, converted to bps, rounded up.
    function _toAprBps(
        uint256 baseRateWad,
        uint256 totalFee,
        uint256 principal
    ) private pure returns (uint256) {
        uint256 effectiveRateWad = baseRateWad + totalFee.wadDivUp(principal);
        return effectiveRateWad.wadMulUp(WadMath.MAX_BPS);
    }

    function _removeBeneficiaryAdapter(
        address beneficiary,
        address adapterAddr
    ) private {
        address[] storage list = _beneficiaryAdapters[beneficiary];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; ++i) {
            if (list[i] == adapterAddr) {
                list[i] = list[len - 1];
                list.pop();
                break;
            }
        }
        _hasBeneficiaryAdapter[beneficiary][adapterAddr] = false;
    }

    /// @dev Fixed-size, gas-capped staticcall. Never reverts; returns ok=false on
    /// failure or short returndata. Copies at most 64 bytes, so returndata bombs are harmless.
    function _probe(
        address target,
        bytes memory data,
        uint256 words
    ) private view returns (bool ok, uint256 x, uint256 y) {
        uint256 gasCap = ADAPTER_CALL_GAS;
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            ok := staticcall(
                gasCap,
                target,
                add(data, 0x20),
                mload(data),
                ptr,
                mul(words, 0x20)
            )
            if lt(returndatasize(), mul(words, 0x20)) {
                ok := 0
            }
            if ok {
                x := mload(ptr)
                if gt(words, 1) {
                    y := mload(add(ptr, 0x20))
                }
            }
        }
    }
}
