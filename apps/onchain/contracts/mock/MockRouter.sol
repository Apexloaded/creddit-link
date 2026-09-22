// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only mock of the router contract
/// @dev This is used in the test suite to mock the router contract
/// @dev It is not intended for use in production
contract MockRouter {
    IERC20 public usdg;
    uint256 public totalDebt;
    uint256 public borrowAprBps = 500; // 5% in basis points (500 bps)

    mapping(address => uint256) public beneficiaryDebt;

    constructor(address _usdg) {
        usdg = IERC20(_usdg);
    }

    function setTotalDebt(uint256 _debt) external {
        totalDebt = _debt;
    }

    function setBorrowAprBps(uint256 _bps) external {
        borrowAprBps = _bps;
    }

    function currentTotalDebt() external view returns (uint256) {
        return totalDebt;
    }

    function currentBorrowAPR() external view returns (uint256) {
        return borrowAprBps;
    }

    function borrow(
        address beneficiary,
        uint256 amount
    ) external returns (uint256 totalReceived, uint256 weightedAprBps) {
        totalDebt += amount;
        beneficiaryDebt[beneficiary] += amount;

        // Transfer funds directly to the beneficiary as required by LendingRouter logic
        usdg.transfer(beneficiary, amount);

        return (amount, borrowAprBps);
    }

    function repay(
        address beneficiary,
        uint256 amount
    ) external returns (uint256 totalPaid) {
        uint256 debt = beneficiaryDebt[beneficiary];
        uint256 payAmount = amount > debt ? debt : amount;

        if (payAmount > 0) {
            beneficiaryDebt[beneficiary] -= payAmount;
            if (totalDebt >= payAmount) {
                totalDebt -= payAmount;
            } else {
                totalDebt = 0;
            }

            // Pull tokens from msg.sender (CredditCreditLine)
            usdg.transferFrom(msg.sender, address(this), payAmount);
        }

        return payAmount;
    }
}
