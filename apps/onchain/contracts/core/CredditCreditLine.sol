// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {CredditCore} from "./CredditCore.sol";
import {CredditAssetRegistry} from "./CredditAssetRegistry.sol";
import {CredditRiskEngine} from "./CredditRiskEngine.sol";
import {CredditLendingRouter} from "./CredditLendingRouter.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {CreditRiskMath} from "../libraries/CreditRiskMath.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided, ZeroAmount, AssetNotEnabled} from "./CredditErrors.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";

/// @notice Custom Errors for the CredditCore contract
error MaxExposureExceeded(address asset, uint256 newTotal, uint256 maxExposure);
error TooManyCollateralAssets();
error InsufficientCollateralBalance(
    address asset,
    uint256 requested,
    uint256 balance
);
error NoActiveDebt(address user);
error ExceedsCreditLimit(uint256 requestedDebt, uint256 creditLimit);
error PositionNotLiquidatable(address user, uint256 debt);
error CloseFactorExceeded(uint256 debtToCover, uint256 maxRepay);
error InsufficientSeizableCollateral(
    address asset,
    uint256 requested,
    uint256 available
);
error PositionUnsafeAfterWithdrawal();
error RouterRepayShortfall(uint256 requested, uint256 paid);

/// @title CredditCreditLine
/// @notice The central CredditLink protocol contract. Lets a user
/// deposit one or more registered Stock Tokens as collateral and draw a single,
/// unified USDG credit line against their combined, risk-adjusted portfolio value
contract CredditCreditLine is CredditCore {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    using WadMath for uint256;

    /// @dev Reference to the asset registry contract.
    CredditAssetRegistry public registry;

    /// @dev Reference to the risk engine contract.
    CredditRiskEngine public riskEngine;

    /// @dev Reference to the risk engine contract.
    IPriceOracle public oracle;

    /// @dev The lending router contract.
    CredditLendingRouter public router;

    /// @dev The USDG token contract.
    IERC20 public usdg;
    /// @dev The number of decimals of the USDG token.
    uint8 public usdgDecimals;

    /// @dev The debt index for USDG. Initialized to 1e18 in `initialize`.
    uint256 public debtIndexWad;
    /// @dev Total number of debt shares across all users.
    uint256 public totalDebtShares;
    /// @dev Timestamp of the last interest accrual.
    uint256 public lastAccrualTimestamp;

    /// @notice Struct to group variables and cleanly pass execution state between helpers
    /// @param debtToCover The amount of USDG to liquidate collateral for.
    /// @param debtToCoverWad The amount of USDG to liquidate collateral for in 18 decimals.
    /// @param totalCollateralToSeize The total collateral to seize.
    /// @param liquidatorReward The liquidator reward.
    /// @param protocolFee The protocol fee.
    struct LiquidationAmounts {
        uint256 debtToCover;
        uint256 debtToCoverWad;
        uint256 totalCollateralToSeize;
        uint256 liquidatorReward;
        uint256 protocolFee;
    }

    /// @notice Emitted when debt is issued.
    /// @param user The address of the user.
    /// @param amountWad The amount of debt issued.
    /// @param sharesMintedWad The number of debt shares minted.
    /// @param newTotalDebtWad The new total debt.
    event Borrowed(
        address indexed user,
        uint256 amountWad,
        uint256 sharesMintedWad,
        uint256 newTotalDebtWad
    );

    /// @notice Emitted when USDG is repaid.
    /// @param payer The address of the payer.
    /// @param user The address of the user.
    /// @param amountRepaid The amount of USDG repaid.
    /// @param sharesBurned The number of debt shares burned.
    /// @param newTotalDebt The new total debt.
    event Repaid(
        address indexed payer,
        address indexed user,
        uint256 amountRepaid,
        uint256 sharesBurned,
        uint256 newTotalDebt
    );

    /// @notice Emitted when collateral is liquidated.
    /// @param liquidator The address of the liquidator.
    /// @param user The address of the user.
    /// @param collateralAsset The asset that was liquidated.
    /// @param debtAmount The amount of debt that was liquidated.
    /// @param collateralToSeize The amount of collateral that was liquidated.
    event Liquidated(
        address indexed liquidator,
        address indexed user,
        address indexed collateralAsset,
        uint256 debtAmount,
        uint256 collateralToSeize
    );

    /// @notice Emitted when collateral is deposited.
    /// @param user The address of the user.
    /// @param asset The asset that was deposited.
    /// @param amount The amount of the asset that was deposited.
    event CollateralDeposited(
        address indexed user,
        address indexed asset,
        uint256 amount
    );

    /// @notice Emitted when collateral is withdrawn.
    /// @param user The address of the user.
    /// @param asset The asset that was withdrawn.
    /// @param amount The amount of the asset that was withdrawn.
    event CollateralWithdrawn(
        address indexed user,
        address indexed asset,
        uint256 amount
    );

    /// @notice Emitted when debt interest is accrued.
    /// @param debtIncreaseWad The amount of debt increase.
    /// @param newDebtIndexWad The new debt index.
    /// @param borrowAPR The borrow APR.
    event DebtInterestAccrued(
        uint256 debtIncreaseWad,
        uint256 newDebtIndexWad,
        uint256 borrowAPR
    );

    /// @dev user => debt balance (in USDG) issued against collateral.
    mapping(address => uint256) public debtShares;
    /// @dev user => collateral asset => raw token amount deposited.
    mapping(address => mapping(address => uint256))
        public userCollateralBalance;
    /// @dev user => bounded list of assets they currently (or previously) hold,
    /// used only to bound iteration; membership also tracked in `_userHasAsset`.
    mapping(address => EnumerableSet.AddressSet) private _userCollateralAssets;
    /// @dev user => asset => true if user currently holds that asset.
    /// used to check if an asset has been deposited by a user.
    mapping(address => mapping(address => bool)) internal _userHasAsset;
    /// @dev running total deposited per asset across all users, checked against
    /// the registry's maxExposure.
    mapping(address => uint256) public totalDeposited;

    /// @notice Initialized only once when the contract is deployed.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param _assetRegistry The address of the asset registry contract.
    /// @param _usdg The address of the USDG token contract.
    /// @dev These roles allow the admin to add, update, or remove assets from the registry.
    function initialize(
        address admin,
        address _assetRegistry,
        address _usdg,
        address _riskEngine,
        address _oracle,
        address _router
    ) external initializer {
        if (
            admin == address(0) ||
            _assetRegistry == address(0) ||
            _usdg == address(0) ||
            _riskEngine == address(0) ||
            _oracle == address(0) ||
            _router == address(0)
        ) revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Initialize callable contracts
        registry = CredditAssetRegistry(_assetRegistry);
        riskEngine = CredditRiskEngine(_riskEngine);
        oracle = IPriceOracle(_oracle);
        router = CredditLendingRouter(_router);
        usdg = IERC20(_usdg);
        usdgDecimals = IERC20Metadata(_usdg).decimals();

        // Initialize debt index to 1
        debtIndexWad = WadMath.WAD;

        // Initialize timestamp to contract deployment block
        lastAccrualTimestamp = block.timestamp;
    }

    /// @notice Deposits collateral into the protocol.
    /// @param asset The asset to deposit.
    /// @param amount The amount of the asset to deposit.
    function depositCollateral(
        address asset,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        CredditAssetRegistry.AssetConfig memory cfg = registry.getAsset(asset);
        if (!cfg.isEnabled) revert AssetNotEnabled(asset);

        uint256 newTotal = totalDeposited[asset] + amount;
        if (cfg.maxExposure != 0 && newTotal > cfg.maxExposure) {
            revert MaxExposureExceeded(asset, newTotal, cfg.maxExposure);
        }

        if (!_userHasAsset[msg.sender][asset]) {
            if (
                _userCollateralAssets[msg.sender].length() >=
                riskEngine.maxCollateralAssetsPerUser()
            ) revert TooManyCollateralAssets();

            _userHasAsset[msg.sender][asset] = true;
            _userCollateralAssets[msg.sender].add(asset);
        }

        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(asset).balanceOf(address(this)) -
            balanceBefore;
        if (received == 0) revert ZeroAmount();

        uint256 receivedTotal = totalDeposited[asset] + received;
        if (cfg.maxExposure != 0 && receivedTotal > cfg.maxExposure) {
            revert MaxExposureExceeded(asset, receivedTotal, cfg.maxExposure);
        }

        userCollateralBalance[msg.sender][asset] += received;
        totalDeposited[asset] = receivedTotal;

        emit CollateralDeposited(msg.sender, asset, received);
    }

    /// @notice Withdraws collateral from the protocol.
    /// @param asset The asset to withdraw.
    /// @param amount The amount of the asset to withdraw.
    function withdrawCollateral(
        address asset,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 currentBalance = userCollateralBalance[msg.sender][asset];
        if (amount > currentBalance)
            revert InsufficientCollateralBalance(asset, amount, currentBalance);

        uint256 newBalance = currentBalance - amount;
        userCollateralBalance[msg.sender][asset] = newBalance;
        totalDeposited[asset] -= amount;

        // If fully withdrawn, remove from active set to free up a slot for the user
        if (newBalance == 0) {
            _removeCollateralAsset(msg.sender, asset);
        }

        // Solvency check: with the ledger already reduced, the remaining
        // collateral must still support the outstanding debt.
        _syncDebtIndex();
        uint256 debtWad = _debt(msg.sender);
        if (debtWad != 0) {
            uint256 liqWeighted = riskEngine.riskAdjustedValue(
                address(this),
                msg.sender
            );
            if (CreditRiskMath.isLiquidatable(liqWeighted, debtWad))
                revert PositionUnsafeAfterWithdrawal();
        }

        IERC20(asset).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, asset, amount);
    }

    /// @notice Borrows USDG against collateral.
    /// @param amount The amount of USDG to borrow.
    function borrow(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        uint256 amountWad = amount.toWad(usdgDecimals);
        uint256 currentUserDebt = _debt(msg.sender);
        uint256 newDebt = currentUserDebt + amountWad;

        uint256 limitWad = riskEngine.creditLimit(address(this), msg.sender);
        if (newDebt > limitWad) revert ExceedsCreditLimit(newDebt, limitWad);

        // Mint debt shares rounded UP: the protocol never under-tracks debt.
        uint256 sharesToMint = amountWad.wadDivUp(debtIndexWad);
        debtShares[msg.sender] += sharesToMint;
        totalDebtShares += sharesToMint;

        // Mint USDG to user via router
        router.borrow(msg.sender, amount);

        emit Borrowed(msg.sender, amountWad, sharesToMint, newDebt);
    }

    /// @notice Repays USDG debt.
    /// @param amount The amount of USDG to repay.
    function repay(uint256 amount) external whenNotPaused nonReentrant {
        _repay(msg.sender, msg.sender, amount);
    }

    /// @notice Repays USDG debt on behalf of another user.
    /// @param user The address of the user to repay debt for.
    /// @param amount The amount of USDG to repay.
    function repayFor(
        address user,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        _repay(msg.sender, user, amount);
    }

    /// @notice Liquidates the collateral of a user.
    /// @param borrower The address of the user to liquidate collateral for.
    /// @param debtAsset The asset to liquidate collateral for.
    /// @param debtToCover The amount of USDG to liquidate collateral for.
    /// @dev user can repay partial of the debt or the whole debt
    /// @dev anyone can call this function to liquidate
    function liquidate(
        address borrower,
        address debtAsset,
        uint256 debtToCover
    ) external nonReentrant whenNotPaused {
        if (debtToCover == 0) revert ZeroAmount();
        _syncDebtIndex();

        // Step 1: Validate position and cap debt repayment limits
        uint256 debtToCoverWad = _validateAndCapRepayment(
            borrower,
            debtToCover
        );

        // Step 2: Compute oracle prices, dynamic collateral capping, and fee breakdowns
        LiquidationAmounts memory amounts = _calculateLiquidationSeizure(
            borrower,
            debtAsset,
            debtToCoverWad
        );

        // Step 3: Apply state changes, burn shares, repay debt, and transfer tokens
        _executeLiquidationState(borrower, debtAsset, amounts);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Returns the amount of collateral for a specific user and asset.
    /// @param user The address of the user.
    /// @param asset The address of the asset.
    /// @return The amount of collateral for the specified user and asset.
    function collateralOf(
        address user,
        address asset
    ) external view returns (uint256) {
        return userCollateralBalance[user][asset];
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/

    /// @notice Syncs the debt index to the current time.
    /// @dev This function is called by the user when they deposit or withdraw collateral.
    function _syncDebtIndex() internal {
        // 1. Ensure time has passed to prevent redundant executions
        if (block.timestamp == lastAccrualTimestamp) return;

        // 2. If no shares exist, set index to 1 WAD (or keep current index) and update timestamp
        if (totalDebtShares == 0) {
            if (debtIndexWad == 0) {
                debtIndexWad = WadMath.WAD; // Ensure default initialization to 1.0 (1e18)
            }
            lastAccrualTimestamp = block.timestamp;
            return;
        }

        uint256 previousIndex = debtIndexWad;
        uint256 sourceDebt = router.currentTotalDebt();

        // 3. Round DOWN when computing new index (conservative for debt indexing)
        uint256 newIndex = sourceDebt.wadDivDown(totalDebtShares);

        // 4. Monotonicity check: Index should only ever increase
        if (newIndex > previousIndex) {
            debtIndexWad = newIndex;

            // Calculate total new interest accrued in USDG WAD across the entire protocol
            uint256 deltaIndex = newIndex - previousIndex;
            uint256 interestAccruedWad = totalDebtShares.wadMulDown(deltaIndex);

            emit DebtInterestAccrued(
                interestAccruedWad,
                newIndex,
                router.currentBorrowAPR()
            );
        }

        lastAccrualTimestamp = block.timestamp;
    }

    /// @notice Validates position liquidatability and enforces close factor constraints.
    /// @param borrower The address of the user to liquidate collateral for.
    /// @param debtToCover The amount of USDG to liquidate collateral for.
    /// @return debtToCoverWad The amount of USDG to liquidate collateral for in 18 decimals.
    function _validateAndCapRepayment(
        address borrower,
        uint256 debtToCover
    ) internal view returns (uint256 debtToCoverWad) {
        uint256 debtWad = _debt(borrower);

        bool isLiquidatable = riskEngine.isLiquidatable(
            address(this),
            borrower,
            debtWad
        );
        if (!isLiquidatable) {
            revert PositionNotLiquidatable(borrower, debtWad);
        }

        debtToCoverWad = debtToCover.toWad(usdgDecimals);

        // Cap repayment to actual user debt to prevent over-liquidation
        if (debtToCoverWad > debtWad) {
            debtToCoverWad = debtWad;
        }

        uint256 closeFactorWad = riskEngine.liquidationCloseFactorWad();
        uint256 maxRepayWad = debtWad.wadMulDown(closeFactorWad);

        if (debtToCoverWad < debtWad && debtToCoverWad > maxRepayWad) {
            revert CloseFactorExceeded(debtToCoverWad, maxRepayWad);
        }
    }

    /// @notice Handles oracle price fetching and computes collateral seizure, dynamic capping, and fee splits.
    /// @param borrower The address of the user to liquidate collateral for.
    /// @param debtAsset The address of the asset to liquidate collateral for.
    /// @param debtToCoverWad The amount of USDG to liquidate collateral for in 18 decimals.
    /// @return amounts The collateral seizure amounts.
    function _calculateLiquidationSeizure(
        address borrower,
        address debtAsset,
        uint256 debtToCoverWad
    ) internal view returns (LiquidationAmounts memory amounts) {
        CredditAssetRegistry.AssetConfig memory cfg = registry.getAsset(
            debtAsset
        );

        uint256 collateralPriceWad = oracle.getUsdPrice(debtAsset);
        uint256 usdgPriceWad = oracle.getUsdPrice(address(usdg));

        uint256 debtValueUsdWad = debtToCoverWad.wadMulDown(usdgPriceWad);

        // Total collateral to seize = debt value + penalty
        amounts.totalCollateralToSeize = CreditRiskMath.collateralToSeize(
            debtValueUsdWad,
            collateralPriceWad,
            cfg.liquidationPenaltyBps,
            cfg.decimals
        );

        uint256 availableCollateral = userCollateralBalance[borrower][
            debtAsset
        ];

        // Dynamic Collateral Capping
        if (amounts.totalCollateralToSeize > availableCollateral) {
            if (availableCollateral == 0) {
                revert InsufficientSeizableCollateral(
                    debtAsset,
                    amounts.totalCollateralToSeize,
                    availableCollateral
                );
            }

            amounts.totalCollateralToSeize = availableCollateral;

            debtToCoverWad = CreditRiskMath.calculateMaxCoverableDebt(
                availableCollateral,
                collateralPriceWad,
                usdgPriceWad,
                cfg.liquidationPenaltyBps,
                cfg.decimals
            );

            debtValueUsdWad = debtToCoverWad.wadMulDown(usdgPriceWad);
        }

        amounts.debtToCoverWad = debtToCoverWad;
        amounts.debtToCover = debtToCoverWad.fromWadUp(usdgDecimals);

        if (amounts.debtToCover == 0) revert ZeroAmount();

        // Calculate liquidator reward vs protocol fee
        amounts.liquidatorReward = CreditRiskMath.collateralToSeize(
            debtValueUsdWad,
            collateralPriceWad,
            cfg.liquidationBonusBps,
            cfg.decimals
        );

        if (amounts.liquidatorReward > amounts.totalCollateralToSeize) {
            amounts.liquidatorReward = amounts.totalCollateralToSeize;
        }

        amounts.protocolFee = amounts.totalCollateralToSeize >
            amounts.liquidatorReward
            ? amounts.totalCollateralToSeize - amounts.liquidatorReward
            : 0;
    }

    /// @notice Updates storage ledgers, burns debt shares, executes transfers, and emits event.
    /// @param borrower The address of the user to liquidate collateral for.
    /// @param debtAsset The address of the asset to liquidate collateral for.
    /// @param amounts The collateral seizure amounts.
    function _executeLiquidationState(
        address borrower,
        address debtAsset,
        LiquidationAmounts memory amounts
    ) internal {
        // Calculate exact shares to burn using wadDivUp
        uint256 sharesToRemove = amounts.debtToCoverWad.wadDivUp(debtIndexWad);
        if (sharesToRemove > debtShares[borrower]) {
            sharesToRemove = debtShares[borrower];
        }

        // Update Debt Shares
        debtShares[borrower] -= sharesToRemove;
        totalDebtShares -= sharesToRemove;

        // Update Local Collateral Ledger
        uint256 availableCollateral = userCollateralBalance[borrower][
            debtAsset
        ];
        userCollateralBalance[borrower][debtAsset] =
            availableCollateral -
            amounts.totalCollateralToSeize;
        totalDeposited[debtAsset] -= amounts.totalCollateralToSeize;

        if (availableCollateral == amounts.totalCollateralToSeize) {
            _removeCollateralAsset(borrower, debtAsset);
        }

        // Repay debt through router
        _repayViaRouter(
            msg.sender,
            borrower,
            amounts.debtToCover,
            amounts.debtToCoverWad
        );

        // Transfer seized collateral reward to liquidator
        IERC20(debtAsset).safeTransfer(msg.sender, amounts.liquidatorReward);

        // Protocol fee logic
        if (amounts.protocolFee > 0) {
            // TODO: implement treasury transfer
        }

        emit Liquidated(
            msg.sender,
            borrower,
            debtAsset,
            amounts.debtToCoverWad,
            amounts.totalCollateralToSeize
        );
    }

    /// @notice Removes an asset from a user's active collateral set and clears its flag,
    /// so a later re-deposit re-registers the asset.
    function _removeCollateralAsset(address user, address asset) internal {
        _userCollateralAssets[user].remove(asset);
        _userHasAsset[user][asset] = false;
    }

    /// @notice Pulls `amount` USDG from `payer` and repays `user`'s debt through the router.
    /// @dev The router pulls from this contract, applies what the adapters accept, and
    /// refunds the rest here; anything not applied is returned to `payer`.
    /// `targetWad` is the WAD debt the amount was derived from. If `amount` was rounded up
    /// to whole token units, one unit of shortfall is tolerated (sub-unit debt dust the
    /// router's principal accounting cannot represent); any larger shortfall reverts.
    /// @return paid The amount the router actually applied.
    function _repayViaRouter(
        address payer,
        address user,
        uint256 amount,
        uint256 targetWad
    ) internal returns (uint256 paid) {
        usdg.safeTransferFrom(payer, address(this), amount);
        usdg.forceApprove(address(router), amount);
        paid = router.repay(user, amount);
        usdg.forceApprove(address(router), 0);

        if (paid < amount) usdg.safeTransfer(payer, amount - paid);

        uint256 slack = amount.toWad(usdgDecimals) > targetWad ? 1 : 0;
        if (paid + slack < amount) revert RouterRepayShortfall(amount, paid);
    }

    /// @notice Calculates the debt of the specified user.
    /// @param user The address of the user.
    /// @return The debt balance of the specified user in USDG.
    function _debt(address user) internal view returns (uint256) {
        return debtShares[user].wadMulUp(debtIndexWad);
    }

    /// @notice Internal helper function to repay USDG debt.
    /// @param payer The address of the payer.
    /// @param user The address of the user to repay debt for.
    /// @param amount The amount of USDG to repay.
    function _repay(address payer, address user, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        uint256 debtWad = _debt(user);
        if (debtWad == 0) revert NoActiveDebt(user);

        uint256 amountWad = amount.toWad(usdgDecimals);

        uint256 actualAmountRepaid;
        uint256 actualAmountRepaidWad;
        uint256 sharesToBurn;

        // --- FULL REPAYMENT ---
        if (amountWad >= debtWad) {
            // Round UP token amount to ensure user pays the full required amount for all their shares.
            actualAmountRepaid = debtWad.fromWadUp(usdgDecimals);
            actualAmountRepaidWad = debtWad;

            // Burn 100% of the user's debt shares to guarantee complete cleanup and avoid underflows.
            sharesToBurn = debtShares[user];
        }
        // --- PARTIAL REPAYMENT ---
        else {
            // Round UP token amount to ensure user pays the full required amount for all their shares.
            actualAmountRepaid = amount;
            actualAmountRepaidWad = amountWad;

            // Burn only the required number of shares for this payment.
            sharesToBurn = amountWad.wadDivUp(debtIndexWad);

            // Safety cap against edge-case rounding overflowing the user's total shares balance
            if (sharesToBurn > debtShares[user]) {
                sharesToBurn = debtShares[user];
            }
        }

        debtShares[user] -= sharesToBurn;
        totalDebtShares -= sharesToBurn;

        // Interaction: pull USDG from the payer and repay through the router.
        // A shortfall beyond rounding dust reverts, which unwinds the share burn above.
        uint256 paid = _repayViaRouter(
            payer,
            user,
            actualAmountRepaid,
            actualAmountRepaidWad
        );

        uint256 remainingDebtWad = _debt(user);

        emit Repaid(
            payer,
            user,
            paid,
            sharesToBurn,
            remainingDebtWad.fromWadDown(usdgDecimals)
        );
    }
}
