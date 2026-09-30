// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CredditRiskEngine} from "../core/CredditRiskEngine.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";

/// @notice Struct to hold position data
/// @param owner The address of the owner.
/// @param isClosed The status of the position.
/// @param cumulativeBorrowed The total amount borrowed.
/// @param cumulativeRepaid The total amount repaid.
/// @param openedAt The timestamp of when the position was opened.
/// @param closedAt The timestamp of when the position was closed.
struct Position {
    address owner;
    bool isClosed;
    bool isLiquidated;
    uint256 cumulativeBorrowed;
    uint256 cumulativeRepaid;
    uint64 liquidatedAt;
    uint64 openedAt;
    uint64 closedAt;
}

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

/***********************************************************
 * CredditCreditLine Events
 ***********************************************************/
/// @notice Emitted when a new position is opened.
/// @param positionId The ID of the position.
/// @param owner The address of the owner.
event PositionOpenedEvent(uint256 indexed positionId, address indexed owner);

/// @notice Emitted when a position is closed.
/// @param positionId The ID of the position.
/// @param owner The address of the owner.
/// @param timestamp The timestamp of when the position was closed.
event PositionClosedEvent(
    uint256 indexed positionId,
    address indexed owner,
    uint256 timestamp
);

/// @notice Emitted when debt is issued.
/// @param positionId The ID of the position.
/// @param user The address of the user.
/// @param amountWad The amount of debt issued.
/// @param sharesMintedWad The number of debt shares minted.
/// @param newTotalDebtWad The new total debt.
event BorrowedEvent(
    uint256 indexed positionId,
    address indexed user,
    uint256 amountWad,
    uint256 sharesMintedWad,
    uint256 newTotalDebtWad
);

/// @notice Emitted when USDG is repaid.
/// @param positionId The ID of the position.
/// @param payer The address of the payer.
/// @param user The address of the user.
/// @param amountRepaid The amount of USDG repaid.
/// @param sharesBurned The number of debt shares burned.
/// @param newTotalDebt The new total debt.
event RepaidEvent(
    uint256 indexed positionId,
    address indexed payer,
    address indexed user,
    uint256 amountRepaid,
    uint256 sharesBurned,
    uint256 newTotalDebt
);

/// @notice Emitted when collateral is liquidated.
/// @param positionId The ID of the position.
/// @param liquidator The address of the liquidator.
/// @param user The address of the user.
/// @param collateralAsset The asset that was liquidated.
/// @param debtAmount The amount of debt that was liquidated.
/// @param collateralToSeize The amount of collateral that was liquidated.
event LiquidatedEvent(
    uint256 indexed positionId,
    address indexed liquidator,
    address indexed user,
    address collateralAsset,
    uint256 debtAmount,
    uint256 collateralToSeize
);

/// @notice Emitted when collateral is deposited.
/// @param positionId The ID of the position.
/// @param user The address of the user.
/// @param asset The asset that was deposited.
/// @param amount The amount of the asset that was deposited.
event CollateralDepositedEvent(
    uint256 indexed positionId,
    address indexed user,
    address indexed asset,
    uint256 amount
);

/// @notice Emitted when collateral is withdrawn.
/// @param positionId The ID of the position.
/// @param user The address of the user.
/// @param asset The asset that was withdrawn.
/// @param amount The amount of the asset that was withdrawn.
event CollateralWithdrawnEvent(
    uint256 indexed positionId,
    address indexed user,
    address indexed asset,
    uint256 amount
);

/// @notice Emitted when debt interest is accrued.
/// @param debtIncreaseWad The amount of debt increase.
/// @param newDebtIndexWad The new debt index.
/// @param borrowAPR The borrow APR.
event DebtInterestAccruedEvent(
    uint256 debtIncreaseWad,
    uint256 newDebtIndexWad,
    uint256 borrowAPR
);

/// @title ICredditCreditLine
/// @notice Interface for ICredditCreditLine
interface ICredditCreditLine {
    /// @notice Returns the next position ID.
    /// @return The next position ID.
    function nextPositionId() external view returns (uint256);

    /// @notice Returns the address of the risk engine.
    /// @return The address of the risk engine.
    function riskEngine() external view returns (CredditRiskEngine);

    /// @notice Returns the address of the risk engine.
    /// @return The address of the risk engine.
    function oracle() external view returns (IPriceOracle);

    /// @notice Returns the address of the risk engine.
    /// @return The address of the risk engine.
    function positions(uint256 positionId) external view returns (Position memory);

    /// @notice Returns the amount of collateral for a specific user and asset.
    /// @param positionId The ID of the position.
    /// @param asset The address of the asset.
    /// @return The amount of collateral.
    function collateralOf(
        uint256 positionId,
        address asset
    ) external view returns (uint256);

    /// @notice Returns the user's positions.
    /// @param user The address of the user.
    /// @return The user's positions.
    function getUserPositions(
        address user
    ) external view returns (uint256[] memory);

    /// @notice Returns the assets for a specific position.
    /// @param positionId The ID of the position.
    /// @return The assets.
    function getPositionAssets(
        uint256 positionId
    ) external view returns (address[] memory);

    /// @notice Returns the debt shares for a specific position.
    /// @param positionId The ID of the position.
    /// @return The debt shares.
    function currentPositionDebt(uint256 positionId) external view returns (uint256);

    /// @notice Returns the owner for a specific position.
    /// @param positionId The ID of the position.
    /// @return The owner of the position.
    function getPositionOwner(
        uint256 positionId
    ) external view returns (address);

    /// @notice Returns the debt shares for a specific position.
    /// @param positionId The ID of the position.
    /// @return The debt shares.
    function debtShares(uint256 positionId) external view returns (uint256);
}
