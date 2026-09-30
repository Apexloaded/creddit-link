// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {CredditCore} from "./CredditCore.sol";
import {CredditAssetRegistry} from "./CredditAssetRegistry.sol";
import {CredditRiskEngine} from "./CredditRiskEngine.sol";
import {CredditTreasury} from "./CredditTreasury.sol";
import {CredditLendingRouter} from "./CredditLendingRouter.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {CreditRiskMath} from "../libraries/CreditRiskMath.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided, ZeroAmount, AssetNotEnabled} from "./CredditErrors.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {Position, LiquidationAmounts, PositionOpenedEvent, PositionClosedEvent, BorrowedEvent, RepaidEvent, LiquidatedEvent, CollateralDepositedEvent, CollateralWithdrawnEvent, DebtInterestAccruedEvent} from "../interfaces/ICredditCreditLine.sol";

/// @notice Custom Errors for the CredditCore contract
error MaxExposureExceeded(address asset, uint256 newTotal, uint256 maxExposure);
error TooManyCollateralAssets();
error InsufficientCollateralBalance(
    address asset,
    uint256 requested,
    uint256 balance
);
error NoActiveDebt(uint256 positionId);
error ExceedsCreditLimit(uint256 requestedDebt, uint256 creditLimit);
error PositionNotLiquidatable(uint256 positionId, uint256 debt);
error InsufficientSeizableCollateral(
    address asset,
    uint256 requested,
    uint256 available
);
error PositionUnsafeAfterWithdrawal();
error RouterRepayShortfall(uint256 requested, uint256 paid);
error PositionDoesNotExist(uint256 positionId);
error NotPositionOwner(uint256 positionId, address caller);

/// @title CredditCreditLine
/// @notice The central CredditLink protocol contract. Lets a user
/// deposit one or more registered Stock Tokens as collateral and draw a single,
/// unified USDG credit line against their combined, risk-adjusted portfolio value
contract CredditCreditLine is CredditCore {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
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

    /// @dev The treasury contract holding protocol fees and reserves.
    CredditTreasury public treasury;

    /// @dev The USDG token contract.
    IERC20 public usdg;
    /// @dev The number of decimals of the USDG token.
    uint8 public usdgDecimals;

    /// @dev Total counter for positions opened.
    uint256 public nextPositionId;

    /// @dev The debt index for USDG. Initialized to 1e18 in `initialize`.
    uint256 public debtIndexWad;
    /// @dev Total number of debt shares across all positions.
    uint256 public totalDebtShares;
    /// @dev Timestamp of the last interest accrual.
    uint256 public lastAccrualTimestamp;

    /// @dev positionId => position struct
    mapping(uint256 => Position) public positions;
    /// @dev positionId => debt balance (in USDG shares)
    mapping(uint256 => uint256) public debtShares;

    /// @dev positionId => collateral asset => raw token amount deposited
    mapping(uint256 => mapping(address => uint256))
        public positionCollateralBalance;
    /// @dev positionId => active assets held in position
    mapping(uint256 => EnumerableSet.AddressSet)
        private _positionCollateralAssets;
    /// @dev user => set of position IDs
    mapping(address => EnumerableSet.UintSet) private _userPositions;
    /// @dev positionId => asset => whether position holds asset
    mapping(uint256 => mapping(address => bool)) internal _positionHasAsset;
    /// @dev Total deposited per asset across all positions (checked against maxExposure)
    mapping(address => uint256) public totalDeposited;

    /// @notice Modifier to ensure the caller is the owner of the position.
    /// @param positionId The ID of the position.
    /// @dev Reverts if the position does not exist or if the caller is not the owner.
    modifier onlyPositionOwner(uint256 positionId) {
        if (positions[positionId].owner == address(0))
            revert PositionDoesNotExist(positionId);
        if (positions[positionId].owner != msg.sender)
            revert NotPositionOwner(positionId, msg.sender);
        _;
    }

    /// @notice Modifier to ensure the position exists.
    /// @param positionId The ID of the position.
    /// @dev Reverts if the position does not exist.
    modifier positionExists(uint256 positionId) {
        if (positions[positionId].owner == address(0))
            revert PositionDoesNotExist(positionId);
        _;
    }

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
        address _router,
        address payable _treasury
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
        treasury = CredditTreasury(_treasury);

        // Initialize debt index to 1
        debtIndexWad = WadMath.WAD;

        // Initialize timestamp to contract deployment block
        lastAccrualTimestamp = block.timestamp;
    }

    /// @notice Opens a new position for the caller.
    /// @return positionId The ID of the new position.
    function openPosition() public whenNotPaused returns (uint256 positionId) {
        positionId = ++nextPositionId;
        positions[positionId] = Position({
            owner: msg.sender,
            openedAt: uint64(block.timestamp),
            closedAt: 0,
            isClosed: false,
            isLiquidated: false,
            liquidatedAt: 0,
            cumulativeBorrowed: 0,
            cumulativeRepaid: 0
        });
        _userPositions[msg.sender].add(positionId);
        emit PositionOpenedEvent(positionId, msg.sender);
    }

    /// @notice Opens a new position for the caller and deposits collateral into it.
    /// @param asset The asset to deposit.
    /// @param amount The amount of the asset to deposit.
    /// @return positionId The ID of the new position.
    function openPositionAndDeposit(
        address asset,
        uint256 amount
    ) external whenNotPaused returns (uint256 positionId) {
        positionId = openPosition();
        depositCollateral(positionId, asset, amount);
    }

    /// @notice Deposits collateral into the protocol.
    /// @param positionId The ID of the position.
    /// @param asset The asset to deposit.
    /// @param amount The amount of the asset to deposit.
    function depositCollateral(
        uint256 positionId,
        address asset,
        uint256 amount
    ) public whenNotPaused nonReentrant positionExists(positionId) {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        CredditAssetRegistry.AssetConfig memory cfg = registry.getAsset(asset);
        if (!cfg.isEnabled) revert AssetNotEnabled(asset);

        uint256 newTotal = totalDeposited[asset] + amount;
        if (cfg.maxExposure != 0 && newTotal > cfg.maxExposure) {
            revert MaxExposureExceeded(asset, newTotal, cfg.maxExposure);
        }

        if (!_positionHasAsset[positionId][asset]) {
            if (
                _positionCollateralAssets[positionId].length() >=
                riskEngine.maxCollateralAssetsPerUser()
            ) revert TooManyCollateralAssets();

            _positionHasAsset[positionId][asset] = true;
            _positionCollateralAssets[positionId].add(asset);
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

        positionCollateralBalance[positionId][asset] += received;
        totalDeposited[asset] = receivedTotal;

        emit CollateralDepositedEvent(positionId, msg.sender, asset, received);
    }

    /// @notice Withdraws collateral from the protocol.
    /// @param positionId The ID of the position.
    /// @param asset The asset to withdraw.
    /// @param amount The amount of the asset to withdraw.
    function withdrawCollateral(
        uint256 positionId,
        address asset,
        uint256 amount
    ) external whenNotPaused nonReentrant onlyPositionOwner(positionId) {
        if (amount == 0) revert ZeroAmount();
        uint256 currentBalance = positionCollateralBalance[positionId][asset];
        if (amount > currentBalance)
            revert InsufficientCollateralBalance(asset, amount, currentBalance);

        uint256 newBalance = currentBalance - amount;
        positionCollateralBalance[positionId][asset] = newBalance;
        totalDeposited[asset] -= amount;

        // If fully withdrawn, remove from active set to free up a slot for the user
        if (newBalance == 0) {
            _removeCollateralAsset(positionId, asset);
        }

        // Solvency check: with the ledger already reduced, the remaining
        // collateral must still support the outstanding debt.
        _syncDebtIndex();
        uint256 debtWad = currentPositionDebt(positionId);
        if (debtWad != 0) {
            (uint256 liqWeighted, , ) = riskEngine.riskAdjustedValue(
                address(this),
                positionId,
                false
            );
            if (CreditRiskMath.isLiquidatable(liqWeighted, debtWad))
                revert PositionUnsafeAfterWithdrawal();
        }

        IERC20(asset).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawnEvent(positionId, msg.sender, asset, amount);
    }

    /// @notice Borrows USDG against collateral.
    /// @param positionId The ID of the position.
    /// @param amount The amount of USDG to borrow.
    function borrow(
        uint256 positionId,
        uint256 amount
    ) external whenNotPaused nonReentrant onlyPositionOwner(positionId) {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        uint256 amountWad = amount.toWad(usdgDecimals);
        uint256 currentUserDebt = currentPositionDebt(positionId);
        uint256 newDebt = currentUserDebt + amountWad;

        uint256 limitWad = riskEngine.creditLimit(address(this), positionId);
        if (newDebt > limitWad) revert ExceedsCreditLimit(newDebt, limitWad);

        // Mint debt shares rounded UP: the protocol never under-tracks debt.
        uint256 sharesToMint = amountWad.wadDivUp(debtIndexWad);
        debtShares[positionId] += sharesToMint;
        totalDebtShares += sharesToMint;
        positions[positionId].cumulativeBorrowed += amount;

        // Mint USDG to user via router
        router.borrow(msg.sender, amount);

        emit BorrowedEvent(
            positionId,
            msg.sender,
            amountWad,
            sharesToMint,
            newDebt
        );
    }

    /// @notice Repays USDG debt.
    /// @param positionId The ID of the position.
    /// @param amount The amount of USDG to repay.
    function repay(
        uint256 positionId,
        uint256 amount
    ) external whenNotPaused nonReentrant positionExists(positionId) {
        _repay(msg.sender, positionId, amount);
    }

    /// @notice Liquidates the collateral of a user.
    /// @param positionId The position id to be liquidated.
    /// @param collateralAsset The asset to liquidate collateral for.
    /// @param debtToCover The amount of USDG to liquidate collateral for.
    /// @dev user can repay partial of the debt or the whole debt
    /// @dev anyone can call this function to liquidate
    function liquidate(
        uint256 positionId,
        address collateralAsset,
        uint256 debtToCover
    ) external nonReentrant whenNotPaused {
        if (debtToCover == 0) revert ZeroAmount();
        _syncDebtIndex();

        // Step 1: Validate position and cap debt repayment limits
        uint256 debtToCoverWad = _validateAndCapRepayment(
            positionId,
            debtToCover
        );

        // Step 2: Compute oracle prices, dynamic collateral capping, and fee breakdowns
        LiquidationAmounts memory amounts = _calculateLiquidationSeizure(
            positionId,
            collateralAsset,
            debtToCoverWad
        );

        // Step 3: Apply state changes, burn shares, repay debt, and transfer tokens
        _executeLiquidationState(positionId, collateralAsset, amounts);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS
     *********************************************************************/

    /// @notice Returns array of all active position IDs for a given user
    /// @param user The address of the user.
    /// @return Array of position IDs owned by the user.
    function getUserPositions(
        address user
    ) external view returns (uint256[] memory) {
        return _userPositions[user].values();
    }

    /// @notice Returns array of all active assets for a specific position.
    /// @param positionId The position id.
    /// @return Array of assets for the specified position.
    function getPositionAssets(
        uint256 positionId
    ) public view returns (address[] memory) {
        return _positionCollateralAssets[positionId].values();
    }

    /// @notice Returns the owner of a specific position.
    /// @param positionId The position id.
    /// @return The owner of the specified position.
    function getPositionOwner(
        uint256 positionId
    ) public view returns (address) {
        return positions[positionId].owner;
    }

    /// @notice Returns the amount of collateral for a specific position and asset.
    /// @param positionId The position id.
    /// @param asset The address of the asset.
    /// @return The amount of collateral for the specified position and asset.
    function collateralOf(
        uint256 positionId,
        address asset
    ) external view returns (uint256) {
        return positionCollateralBalance[positionId][asset];
    }

    /// @notice Live debt index, including interest not yet written to storage.
    function currentDebtIndexWad() external view returns (uint256) {
        return _currentDebtIndexWad();
    }

    /// @notice Live debt for a position (WAD), including interest accrued since the last sync.
    function currentPositionDebt(
        uint256 positionId
    ) public view returns (uint256) {
        return debtShares[positionId].wadMulUp(_currentDebtIndexWad());
    }

    /// @notice Returns the risk adjusted value for a specific position.
    /// @param positionId The position id.
    /// @return The risk adjusted value for the specified position.
    function positionRiskAdjustedValue(
        uint256 positionId
    ) external view returns (uint256) {
        (uint256 liqWeighted, , ) = riskEngine.riskAdjustedValue(
            address(this),
            positionId,
            false
        );
        return liqWeighted;
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
        uint256 sourceDebtWad = router.currentTotalDebt().toWad(usdgDecimals);

        // 3. Round DOWN when computing new index (conservative for debt indexing)
        uint256 newIndex = sourceDebtWad.wadDivDown(totalDebtShares);

        // 4. Monotonicity check: Index should only ever increase
        if (newIndex > previousIndex) {
            debtIndexWad = newIndex;

            // Calculate total new interest accrued in USDG WAD across the entire protocol
            uint256 deltaIndex = newIndex - previousIndex;
            uint256 interestAccruedWad = totalDebtShares.wadMulDown(deltaIndex);

            emit DebtInterestAccruedEvent(
                interestAccruedWad,
                newIndex,
                router.currentBorrowAPR()
            );
        }

        lastAccrualTimestamp = block.timestamp;
    }

    /// @notice Validates position liquidatability and enforces close factor constraints.
    /// @param positionId The position id to liquidate collateral for.
    /// @param debtToCover The amount of USDG to liquidate collateral for.
    /// @return debtToCoverWad The amount of USDG to liquidate collateral for in 18 decimals.
    function _validateAndCapRepayment(
        uint256 positionId,
        uint256 debtToCover
    ) internal view returns (uint256 debtToCoverWad) {
        uint256 debtWad = currentPositionDebt(positionId);

        bool isLiquidatable = riskEngine.isLiquidatable(
            address(this),
            positionId,
            debtWad
        );
        if (!isLiquidatable) {
            revert PositionNotLiquidatable(positionId, debtWad);
        }

        debtToCoverWad = debtToCover.toWad(usdgDecimals);

        // Cap repayment to actual user debt to prevent over-liquidation
        if (debtToCoverWad > debtWad) {
            debtToCoverWad = debtWad;
        }

        uint256 closeFactorWad = riskEngine.liquidationCloseFactorWad();
        uint256 maxRepayWad = debtWad.wadMulDown(closeFactorWad);

        if (debtToCoverWad > maxRepayWad) {
            debtToCoverWad = maxRepayWad;
        }
    }

    /// @notice Handles oracle price fetching and computes collateral seizure, dynamic capping, and fee splits.
    /// @param positionId The position id to liquidate collateral for.
    /// @param collateralAsset The address of the asset to liquidate collateral for.
    /// @param debtToCoverWad The amount of USDG to liquidate collateral for in 18 decimals.
    /// @return amounts The collateral seizure amounts.
    function _calculateLiquidationSeizure(
        uint256 positionId,
        address collateralAsset,
        uint256 debtToCoverWad
    ) internal view returns (LiquidationAmounts memory amounts) {
        CredditAssetRegistry.AssetConfig memory cfg = registry.getAsset(
            collateralAsset
        );

        uint256 collateralPriceWad = oracle.getUsdPrice(collateralAsset);
        uint256 usdgPriceWad = oracle.getUsdPrice(address(usdg));

        uint256 debtValueUsdWad = debtToCoverWad.wadMulDown(usdgPriceWad);

        // Total collateral to seize = debt value + penalty
        amounts.totalCollateralToSeize = CreditRiskMath.collateralToSeize(
            debtValueUsdWad,
            collateralPriceWad,
            cfg.liquidationPenaltyBps,
            cfg.decimals
        );

        uint256 availableCollateral = positionCollateralBalance[positionId][
            collateralAsset
        ];

        // Dynamic Collateral Capping
        if (amounts.totalCollateralToSeize > availableCollateral) {
            if (availableCollateral == 0) {
                revert InsufficientSeizableCollateral(
                    collateralAsset,
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
    /// @param positionId The position id to liquidate collateral for.
    /// @param collateralAsset The address of the asset to liquidate collateral for.
    /// @param amounts The collateral seizure amounts.
    function _executeLiquidationState(
        uint256 positionId,
        address collateralAsset,
        LiquidationAmounts memory amounts
    ) internal {
        uint256 borrowerDebtWad = currentPositionDebt(positionId);
        uint256 sharesToRemove;

        // Calculate exact shares to burn using wadDivUp
        if (amounts.debtToCoverWad >= borrowerDebtWad) {
            sharesToRemove = debtShares[positionId];
        } else {
            sharesToRemove = amounts.debtToCoverWad.wadDivUp(debtIndexWad);
            if (sharesToRemove > debtShares[positionId]) {
                sharesToRemove = debtShares[positionId];
            }
        }

        // Update Debt Shares
        debtShares[positionId] -= sharesToRemove;
        totalDebtShares -= sharesToRemove;

        // Update Local Collateral Ledger
        uint256 availableCollateral = positionCollateralBalance[positionId][
            collateralAsset
        ];
        positionCollateralBalance[positionId][collateralAsset] =
            availableCollateral -
            amounts.totalCollateralToSeize;
        totalDeposited[collateralAsset] -= amounts.totalCollateralToSeize;

        if (availableCollateral == amounts.totalCollateralToSeize) {
            _removeCollateralAsset(positionId, collateralAsset);
        }

        if (debtShares[positionId] == 0 && _isCollateralEmpty(positionId)) {
            positions[positionId].isClosed = true;
            positions[positionId].closedAt = uint64(block.timestamp);
            positions[positionId].isLiquidated = true;
            positions[positionId].liquidatedAt = uint64(block.timestamp);
        }

        // Repay debt through router
        address owner = positions[positionId].owner;
        _repayViaRouter(
            msg.sender,
            owner,
            amounts.debtToCover,
            amounts.debtToCoverWad
        );

        // Transfer seized collateral reward to liquidator
        IERC20(collateralAsset).safeTransfer(
            msg.sender,
            amounts.liquidatorReward
        );

        // Protocol fee logic
        if (amounts.protocolFee > 0 && address(treasury) != address(0)) {
            IERC20(collateralAsset).safeTransfer(
                address(treasury),
                amounts.protocolFee
            );
        }

        emit LiquidatedEvent(
            positionId,
            msg.sender,
            owner,
            collateralAsset,
            amounts.debtToCoverWad,
            amounts.totalCollateralToSeize
        );
    }

    /// @notice Removes an asset from a user's active collateral set and clears its flag,
    /// so a later re-deposit re-registers the asset.
    /// @param positionId The ID of the position.
    /// @param asset The address of the asset to remove.
    function _removeCollateralAsset(
        uint256 positionId,
        address asset
    ) internal {
        _positionCollateralAssets[positionId].remove(asset);
        _positionHasAsset[positionId][asset] = false;
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

    /// @dev Index as it would be if synced right now. Never returns less than the stored index.
    function _currentDebtIndexWad() internal view returns (uint256) {
        if (totalDebtShares == 0) return debtIndexWad;

        uint256 newIndex = router
            .currentTotalDebt()
            .toWad(usdgDecimals)
            .wadDivDown(totalDebtShares);

        return newIndex > debtIndexWad ? newIndex : debtIndexWad;
    }

    function _isCollateralEmpty(
        uint256 positionId
    ) internal view returns (bool) {
        EnumerableSet.AddressSet storage assets = _positionCollateralAssets[
            positionId
        ];
        for (uint256 i = 0; i < assets.length(); i++) {
            address asset = assets.at(i);
            if (positionCollateralBalance[positionId][asset] > 0) {
                return false;
            }
        }
        return true;
    }

    /// @notice Internal helper function to repay USDG debt.
    /// @param payer The address of the payer.
    /// @param positionId The ID of the position.
    /// @param amount The amount of USDG to repay.
    function _repay(
        address payer,
        uint256 positionId,
        uint256 amount
    ) internal {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        uint256 debtWad = currentPositionDebt(positionId);
        if (debtWad == 0) revert NoActiveDebt(positionId);

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
            sharesToBurn = debtShares[positionId];
        }
        // --- PARTIAL REPAYMENT ---
        else {
            // Round UP token amount to ensure user pays the full required amount for all their shares.
            actualAmountRepaid = amount;
            actualAmountRepaidWad = amountWad;

            // Burn only the required number of shares for this payment.
            sharesToBurn = amountWad.wadDivUp(debtIndexWad);

            // Safety cap against edge-case rounding overflowing the user's total shares balance
            if (sharesToBurn > debtShares[positionId]) {
                sharesToBurn = debtShares[positionId];
            }
        }

        debtShares[positionId] -= sharesToBurn;
        totalDebtShares -= sharesToBurn;
        positions[positionId].cumulativeRepaid += actualAmountRepaid;

        // Interaction: pull USDG from the payer and repay through the router.
        // A shortfall beyond rounding dust reverts, which unwinds the share burn above.
        address owner = positions[positionId].owner;
        uint256 paid = _repayViaRouter(
            payer,
            owner,
            actualAmountRepaid,
            actualAmountRepaidWad
        );

        uint256 remainingDebtWad = currentPositionDebt(positionId);

        // If no debt left and no collateral, close position
        if (debtShares[positionId] == 0 && _isCollateralEmpty(positionId)) {
            positions[positionId].isClosed = true;
            positions[positionId].closedAt = uint64(block.timestamp);
            emit PositionClosedEvent(positionId, owner, block.timestamp);
        }

        emit RepaidEvent(
            positionId,
            payer,
            owner,
            paid,
            sharesToBurn,
            remainingDebtWad.fromWadDown(usdgDecimals)
        );
    }
}
