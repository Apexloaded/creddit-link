// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title LendingAdapter
/// @notice Interface for all lending pool adapters.
interface ILendingAdapter {
    /// @notice Returns the name of the lending pool.
    function name() external view returns (string memory);

    /// @notice Returns the loan token of the lending pool.
    function loanToken() external view returns (address);

    /// @notice Returns the available liquidity of the lending pool.
    function availableLiquidity() external view returns (uint256);

    /// @notice Returns the current debt of the lending pool.
    function currentDebt() external view returns (uint256);

    /// @notice Quotes the borrow amount.
    function quoteBorrow(
        uint256 amount
    ) external view returns (uint256 rateBps, uint256 fee);

    /// @notice Borrows the specified amount of tokens from the lending pool.
    function borrow(
        address receiver,
        uint256 amount
    ) external returns (uint256 received);

    /// @notice Repays the specified amount of tokens to the lending pool.
    function repay(
        address payer,
        uint256 amount
    ) external returns (uint256 repaid);
}
