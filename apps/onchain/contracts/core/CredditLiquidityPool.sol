// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {CredditCore} from "./CredditCore.sol";
import {CredditInterestRateModel} from "./CredditInterestRateModel.sol";
import {CredditTreasury} from "./CredditTreasury.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";
import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @notice Custom errors for ILendingAdapter interactions
error InsufficientLiquidity();
error TransferFailed();

contract CredditLiquidityPool is
    CredditCore,
    ERC4626Upgradeable,
    ILendingAdapter
{
    using WadMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice Number of seconds in a 365-day year for annual interest calculation.
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice The total amount of assets currently borrowed from the pool.
    uint256 public totalBorrows;
    /// @notice The timestamp of the last interest accrual.
    uint256 public lastAccrualTimestamp;
    /// @notice Kinked-utilization interest rate model used to price borrows.
    CredditInterestRateModel public rateModel;
    /// @notice Fixed upfront fee per borrow in underlying asset units (or 0 if none).
    uint256 public originationFee;
    /// @notice The treasury contract holding protocol fees and reserves.
    CredditTreasury public treasury;

    /// @notice Emitted when the origination fee is updated.
    event OriginationFeeUpdated(uint256 newFee);

    /// @notice Emitted when the interest rate model is updated.
    event RateModelUpdated(address indexed newRateModel);

    /// @notice Emitted when interest is accrued on the pool.
    event InterestAccrued(
        uint256 interestAccrued,
        uint256 newTotalBorrows,
        uint256 timestamp
    );

    /// @notice Initializes the liquidity pool vault proxy.
    /// @param asset The underlying ERC-20 token managed by this vault (e.g. USDG).
    /// @param _name The name of the LP token issued by this pool (e.g. "Creddit USDG").
    /// @param _symbol The symbol of the LP token (e.g. "cUSDG").
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param rateModel_ The CredditInterestRateModel used to price borrows on this pool.
    function initialize(
        address asset,
        string memory _name,
        string memory _symbol,
        address admin,
        address rateModel_,
        address payable _treasury
    ) public initializer {
        if (
            asset == address(0) ||
            admin == address(0) ||
            rateModel_ == address(0) ||
            _treasury == address(0)
        ) revert ZeroAddressProvided();

        // Initialize Token contracts
        __ERC20_init(_name, _symbol);
        __ERC4626_init(IERC20(asset));

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant POOL_ADMIN_ROLE to the admin
        _grantRole(CredditRoles.POOL_ADMIN_ROLE, admin);
        _grantRole(CredditRoles.TREASURY_ADMIN_ROLE, _treasury);

        rateModel = CredditInterestRateModel(rateModel_);
        lastAccrualTimestamp = block.timestamp;
        treasury = CredditTreasury(_treasury);
    }

    /*********************************************************************
     * INTERNAL INTEREST ACCRUAL FUNCTIONS
     *********************************************************************/

    /// @dev Calculates interest accrued since `lastAccrualTimestamp` without writing to storage.
    /// @return newInterest Amount of interest accrued in underlying token units.
    function _previewAccruedDebt() internal view returns (uint256 newInterest) {
        if (totalBorrows == 0) return 0;

        uint256 timeElapsed = block.timestamp - lastAccrualTimestamp;
        if (timeElapsed == 0) return 0;

        // Use raw balance + totalBorrows here (not totalAssets()) to avoid
        // re-entering totalAssets(), which itself calls this function.
        uint256 totalLiquidityWad = IERC20(asset()).balanceOf(address(this)) +
            totalBorrows;
        uint256 rateWad = rateModel.getBorrowRateWad(
            totalBorrows,
            totalLiquidityWad
        );

        // Linear Interest Formula:
        // interest = totalBorrows * rateWad * timeElapsed / (SECONDS_PER_YEAR * 1e18)
        uint256 annualInterest = totalBorrows.wadMulDown(rateWad);
        newInterest = (annualInterest * timeElapsed) / SECONDS_PER_YEAR;
    }

    /// @dev Accrues interest and updates `totalBorrows` and `lastAccrualTimestamp`.
    function _accrueInterest() internal {
        if (block.timestamp == lastAccrualTimestamp) return;

        uint256 interestAccrued = _previewAccruedDebt();
        if (interestAccrued > 0) {
            totalBorrows += interestAccrued;
            emit InterestAccrued(
                interestAccrued,
                totalBorrows,
                block.timestamp
            );
        }

        lastAccrualTimestamp = block.timestamp;
    }

    /*********************************************************************
     * ADMIN WRITE FUNCTIONS
     *********************************************************************/

    /// @notice Grants the router role to the specified address.
    /// @param router The address to grant the router role to.
    function setRouter(
        address router
    ) external onlyRole(CredditRoles.POOL_ADMIN_ROLE) {
        if (router == address(0)) revert ZeroAddressProvided();
        _grantRole(CredditRoles.ROUTER_ROLE, router);
    }

    /// @notice Updates the flat origination fee charged per borrow.
    /// @param newFee The new fee, in underlying asset units.
    function setOriginationFee(
        uint256 newFee
    ) external onlyRole(CredditRoles.POOL_ADMIN_ROLE) {
        originationFee = newFee;
        emit OriginationFeeUpdated(newFee);
    }

    /// @notice Updates the interest rate model used to price borrows.
    /// @param newRateModel Address of the new CreditInterestRateModel.
    function setRateModel(
        address newRateModel
    ) external onlyRole(CredditRoles.POOL_ADMIN_ROLE) {
        if (newRateModel == address(0)) revert ZeroAddressProvided();
        // Flush interest accrued under the old rate before switching models.
        _accrueInterest();
        rateModel = CredditInterestRateModel(newRateModel);
        emit RateModelUpdated(newRateModel);
    }

    function setTreasury(
        address payable newTreasury
    ) external onlyRole(CredditRoles.POOL_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddressProvided();
        treasury = CredditTreasury(newTreasury);
    }

    /*********************************************************************
     * EXTERNAL WRITE FUNCTIONS (ILendingAdapter)
     *********************************************************************/

    /// @notice Borrows the specified amount of tokens from the liquidity pool.
    /// @param receiver Address to receive the borrowed underlying tokens.
    /// @param amount Principal amount requested (this is what accrues as debt).
    /// @return received Actual amount transferred to the receiver, net of the origination fee.
    function borrow(
        address receiver,
        uint256 amount
    )
        external
        override(ILendingAdapter)
        onlyRole(CredditRoles.ROUTER_ROLE)
        whenNotPaused
        returns (uint256 received)
    {
        if (receiver == address(0)) revert ZeroAddressProvided();

        _accrueInterest();

        if (amount > availableLiquidity()) revert InsufficientLiquidity();

        uint256 fee = originationFee > amount ? amount : originationFee;
        received = amount - fee;

        // Full principal is recorded as debt
        totalBorrows += amount;

        // Send net funds to the borrower
        IERC20(asset()).safeTransfer(receiver, received);

        // Send fee directly to Treasury
        if (fee > 0 && address(treasury) != address(0)) {
            IERC20(asset()).safeTransfer(address(treasury), fee);
        }

        return received;
    }

    /// @notice Repays borrowed tokens back to the liquidity pool.
    /// @param payer Address paying the underlying tokens.
    /// @param amount Amount to repay.
    /// @return repaid Amount successfully repaid and deducted from totalBorrows.
    function repay(
        address payer,
        uint256 amount
    )
        external
        override(ILendingAdapter)
        onlyRole(CredditRoles.ROUTER_ROLE)
        whenNotPaused
        returns (uint256 repaid)
    {
        if (payer == address(0)) revert ZeroAddressProvided();

        _accrueInterest();

        // Cap repayment at current total debt to prevent underflow
        repaid = amount > totalBorrows ? totalBorrows : amount;

        totalBorrows -= repaid;

        // Pull funds from payer into this contract
        IERC20(asset()).safeTransferFrom(payer, address(this), repaid);

        return repaid;
    }

    /*********************************************************************
     * OVERRIDDEN ERC4626 FUNCTIONS
     *********************************************************************/

    /// @notice Total value of assets under management (idle liquid cash + active debt + pending interest).
    function totalAssets() public view override returns (uint256) {
        return
            IERC20(asset()).balanceOf(address(this)) +
            totalBorrows +
            _previewAccruedDebt();
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS (ILendingAdapter)
     *********************************************************************/

    /// @notice Returns the name of the LP token.
    /// @return The name of the LP token.
    function name()
        public
        view
        override(ERC20Upgradeable, IERC20Metadata, ILendingAdapter)
        returns (string memory)
    {
        return super.name();
    }

    /// @notice Returns the symbol of the LP token.
    /// @return The symbol of the LP token.
    function symbol()
        public
        view
        override(ERC20Upgradeable, IERC20Metadata)
        returns (string memory)
    {
        return super.symbol();
    }

    /// @notice Returns the address of the loan token.
    /// @return The address of the loan token.
    function loanToken()
        external
        view
        override(ILendingAdapter)
        returns (address)
    {
        return asset();
    }

    /// @notice Returns the amount of available liquidity in the pool.
    /// @return The amount of available liquidity in the pool.
    function availableLiquidity()
        public
        view
        override(ILendingAdapter)
        returns (uint256)
    {
        return IERC20(asset()).balanceOf(address(this));
    }

    /// @notice Returns the current outstanding debt, including interest accrued
    /// since the last on-chain accrual but not yet written to storage.
    /// @return The current total debt owed to the pool.
    function currentDebt()
        external
        view
        override(ILendingAdapter)
        returns (uint256)
    {
        return totalBorrows + _previewAccruedDebt();
    }

    /// @notice Quotes the current borrow rate and flat origination fee for a borrow.
    /// @dev The fee is currently flat rather than amount-dependent, and the rate depends only on utilization.
    /// @return rateBps The current annual borrow rate, in basis points.
    /// @return fee The flat origination fee that would be charged, in underlying units.
    function quoteBorrow()
        external
        view
        override(ILendingAdapter)
        returns (uint256 rateBps, uint256 fee)
    {
        uint256 totalLiquidityWad = IERC20(asset()).balanceOf(address(this)) +
            totalBorrows;
        uint256 rateWad = rateModel.getBorrowRateWad(
            totalBorrows,
            totalLiquidityWad
        );

        // WAD (1e18) -> bps (1e4)
        rateBps = rateWad / 1e14;
        fee = originationFee;
    }

    /*********************************************************************
     * INTERNAL ERC4626 HOOKS
     *********************************************************************/

    /// @dev Internal hook override to update interest before minting shares.
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        _accrueInterest();
        super._deposit(caller, receiver, assets, shares);
    }

    /// @dev Internal hook override to update interest before burning shares.
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        _accrueInterest();
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /// @dev Adds virtual shares and assets to protect against first-depositor share inflation attacks.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }
}
