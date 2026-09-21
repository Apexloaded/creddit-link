// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CredditCore} from "./CredditCore.sol";
import {CredditAssetRegistry} from "./CredditAssetRegistry.sol";
import {CredditCreditLine} from "./CredditCreditLine.sol";
import {CredditOracle} from "./CredditOracle.sol";
import {ZeroAddressProvided, ZeroAmount} from "./CredditErrors.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";

/// @notice Custom Errors for the CredditLendingRouter contract
error InvalidCreditLine();
error AdapterHasDebt();
error AdapterAssetMismatch();
error TooManyAdapters();

/// @title CredditLendingRouter
/// @notice Cross-protocol capital abstraction. Splits a single borrow/repay
/// request across every enabled lending pool via adapters, cheapest source first,
/// and tracks per-borrower, per-adapter balances so repayment can unwind the same
/// allocation correctly.
contract CredditLendingRouter is CredditCore {
    using SafeERC20 for IERC20;

    /// @dev Maximum number of adapters supported.
    uint256 public constant MAX_ADAPTERS = 8;

    /// @dev The USDG token contract.
    IERC20 public usdg;

    /// @notice Adapter information.
    /// @param enabled Whether the adapter is enabled.
    /// @param registered Whether the adapter is registered.
    /// @param index The index of the adapter in the _adapters array.
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

    /// @notice Emitted when the credit line contract is set.
    /// @param creditLine The address of the credit line contract.
    event CreditLineSet(address indexed creditLine);

    /// @notice Emitted when an adapter is set.
    /// @param adapter The address of the adapter.
    /// @param enabled Whether the adapter is enabled.
    event AdapterSet(address indexed adapter, bool enabled);

    /// @notice Mapping from adapter address to its information.
    mapping(address => AdapterInfo) public adapters;

    /// @dev Array of all adapters in the router.
    ILendingAdapter[] internal _adapters;

    /// @notice The credit line contract.
    address public creditLine;

    /// @notice Initializes the CredditOracle contract.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
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
    /// @param adapter The address of the adapter to set.
    /// @param isEnabled Whether the adapter should be enabled.
    function setAdapter(
        address adapter,
        bool isEnabled
    ) external onlyRole(CredditRoles.ADAPTER_ADMIN_ROLE) whenNotPaused {
        if (adapter == address(0)) revert ZeroAddressProvided();
        if (
            !isEnabled &&
            adapters[adapter].enabled &&
            ILendingAdapter(adapter).currentDebt() != 0
        ) revert AdapterHasDebt();

        if (isEnabled && !adapters[adapter].enabled) {
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

    function borrow(
        address beneficiary,
        uint256 amountDesired
    )
        external
        onlyRole(CredditRoles.CREDIT_LINE_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 totalReceived, uint256 weightedAprBps)
    {
        if (amountDesired == 0) revert ZeroAmount();
        if (beneficiary == address(0)) revert ZeroAddressProvided();
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

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
        uint256 n = _adapters.length;
        bool[] memory used = new bool[](n);
        address[] memory candidateAdapters = new address[](n);
        uint256[] memory candidateAvailable = new uint256[](n);
        uint256[] memory candidateRate = new uint256[](n);
        uint256[] memory candidateFee = new uint256[](n);
        uint256 candidateCount = 0;

        // Probe every enabled adapter; skip (don't revert on) any that errors.
        for (uint256 i = 0; i < n; i++) {
            address adapterAddr = address(_adapters[i]);
            if (used[i] || !adapters[adapterAddr].enabled) continue;

            try ILendingAdapter(adapterAddr).availableLiquidity() returns (
                uint256 liquidity
            ) {
                if (liquidity == 0) continue;
                try ILendingAdapter(adapterAddr).quoteBorrow(amount) returns (
                    uint256 rateWad,
                    uint256 feeWad
                ) {
                    candidateAdapters[candidateCount] = adapterAddr;
                    candidateAvailable[candidateCount] = liquidity;
                    candidateRate[candidateCount] = rateWad;
                    candidateFee[candidateCount] = feeWad;
                    candidateCount++;
                } catch {
                    continue;
                }
            } catch {
                continue;
            }
        }
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
}
