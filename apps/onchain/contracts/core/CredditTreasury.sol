// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CredditCore} from "./CredditCore.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";

/// @notice Custom errors for CredditTreasury
error InsufficientTreasuryBalance(uint256 requested, uint256 available);

/// @title CredditTreasury
/// @notice Holds protocol revenue (origination fees, liquidations, reserves) and handles emergency withdrawals or payouts.
contract CredditTreasury is CredditCore {
    using SafeERC20 for IERC20;

    /// @notice Emitted when funds are swept/withdrawn from the treasury.
    event FundsWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    /// @notice Emitted when native ETH is deposited into the treasury.
    event ETHReceived(address indexed sender, uint256 amount);

    /// @notice Emitted when native ETH is withdrawn from the treasury.
    event ETHWithdrawn(address indexed to, uint256 amount);

    /// @dev Initializer for upgradeable proxy.
    /// @param admin Address granted DEFAULT_ADMIN_ROLE and TREASURY_ADMIN_ROLE.
    function initialize(address admin) external initializer {
        if (admin == address(0)) revert ZeroAddressProvided();

        // Initialize CredditCore access controls & pausable state
        __CredditCore_init(admin);

        // Grant Treasury Admin permissions
        _grantRole(CredditRoles.TREASURY_ADMIN_ROLE, admin);
    }

    /// @notice Allows contract to receive native ETH directly.
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    /*********************************************************************
     * ADMIN / TREASURY OPERATIONS
     *********************************************************************/

    /// @notice Withdraws ERC-20 tokens (e.g. USDG origination fees) from the treasury to a recipient.
    /// @param token Address of the ERC-20 token to transfer.
    /// @param to Recipient address (e.g., DAO multisig, yield vault, or pool).
    /// @param amount Amount of tokens to transfer.
    function withdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(CredditRoles.TREASURY_ADMIN_ROLE) whenNotPaused {
        if (token == address(0) || to == address(0)) revert ZeroAddressProvided();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (amount > balance) {
            revert InsufficientTreasuryBalance(amount, balance);
        }

        IERC20(token).safeTransfer(to, amount);
        emit FundsWithdrawn(token, to, amount);
    }

    /// @notice Withdraws native ETH held by the treasury.
    /// @param to Recipient address.
    /// @param amount Amount of ETH in wei.
    function withdrawETH(
        address payable to,
        uint256 amount
    ) external onlyRole(CredditRoles.TREASURY_ADMIN_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddressProvided();

        uint256 balance = address(this).balance;
        if (amount > balance) {
            revert InsufficientTreasuryBalance(amount, balance);
        }

        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit ETHWithdrawn(to, amount);
    }

    /*********************************************************************
     * VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Queries the balance of a specific token held in the treasury.
    /// @param token Address of the ERC-20 token.
    /// @return Balance of the specified token.
    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }
}