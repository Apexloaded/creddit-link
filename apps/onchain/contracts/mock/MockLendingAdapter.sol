// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockLendingAdapter is ILendingAdapter {
    address public immutable override loanToken;
    string private mockName = "Mock Lending Adapter";

    uint256 public mockAvailableLiquidity;
    uint256 public mockRateBps;
    uint256 public mockFeeWad;
    uint256 public mockCurrentDebt;

    uint256 public underdeliverAmount;
    uint256 public overrepayAmount;
    bool public revertOnBorrow;
    bool public revertOnRepay;
    bool public revertOnAvailableLiquidity;
    bool public revertOnQuoteBorrow;

    mapping(address => uint256) public debtOf;

    constructor(address _loanToken) {
        loanToken = _loanToken;
    }

    function setName(string memory _name) external {
        mockName = _name;
    }

    function name() external view override returns (string memory) {
        return mockName;
    }

    function setMockParams(
        uint256 _available,
        uint256 _rateBps,
        uint256 _feeWad,
        uint256 _debt
    ) external {
        mockAvailableLiquidity = _available;
        mockRateBps = _rateBps;
        mockFeeWad = _feeWad;
        mockCurrentDebt = _debt;
    }

    function setFailureFlags(
        uint256 _underdeliver,
        uint256 _overrepay,
        bool _revertBorrow,
        bool _revertRepay
    ) external {
        underdeliverAmount = _underdeliver;
        overrepayAmount = _overrepay;
        revertOnBorrow = _revertBorrow;
        revertOnRepay = _revertRepay;
    }

    function setProbeFailureFlags(
        bool _revertLiquidity,
        bool _revertQuote
    ) external {
        revertOnAvailableLiquidity = _revertLiquidity;
        revertOnQuoteBorrow = _revertQuote;
    }

    function availableLiquidity() external view override returns (uint256) {
        if (revertOnAvailableLiquidity) revert("MOCK_LIQUIDITY_REVERT");
        return mockAvailableLiquidity;
    }

    function quoteBorrow()
        external
        view
        override
        returns (uint256 rateBps, uint256 fee)
    {
        if (revertOnQuoteBorrow) revert("MOCK_QUOTE_REVERT");
        return (mockRateBps, mockFeeWad);
    }

    function currentDebt() external view override returns (uint256) {
        return mockCurrentDebt;
    }

    function borrow(
        address beneficiary,
        uint256 amount
    ) external override returns (uint256) {
        if (revertOnBorrow) revert("MOCK_BORROW_REVERT");

        uint256 delivered = amount > underdeliverAmount
            ? amount - underdeliverAmount
            : 0;
        debtOf[beneficiary] += amount;
        mockCurrentDebt += amount;

        if (delivered > 0) {
            ERC20(loanToken).transfer(beneficiary, delivered);
        }
        return delivered;
    }

    function repay(
        address payer,
        uint256 amount
    ) external override returns (uint256) {
        if (revertOnRepay) revert("MOCK_REPAY_REVERT");

        uint256 actualRepaid = amount + overrepayAmount;
        ERC20(loanToken).transferFrom(payer, address(this), amount);

        if (mockCurrentDebt >= actualRepaid) {
            mockCurrentDebt -= actualRepaid;
        } else {
            mockCurrentDebt = 0;
        }

        if (debtOf[payer] >= actualRepaid) {
            debtOf[payer] -= actualRepaid;
        } else {
            debtOf[payer] = 0;
        }

        return actualRepaid;
    }
}
