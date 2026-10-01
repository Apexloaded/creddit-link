// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CredditCore} from "./CredditCore.sol";
import {CredditRiskEngine} from "./CredditRiskEngine.sol";
import {ICredditCreditLine, Position} from "../interfaces/ICredditCreditLine.sol";
import {CredditLiquidityPool} from "../core/CredditLiquidityPool.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";

/// @title CredditLens
/// @notice Read-only helper contract for dApp frontends, explorers, and liquidator bots
contract CredditLens is CredditCore {
    using WadMath for uint256;

    ICredditCreditLine public cl;
    CredditLiquidityPool public lp;

    struct CollateralDetail {
        string symbol;
        address asset;
        uint256 amount;
        uint256 priceInUsd;
    }

    /// @notice Unified data structure representing a complete position summary.
    struct PositionSummary {
        uint256 positionId;
        address owner;
        uint256 debtWad;
        uint256 collateralValueWad;
        uint256 creditLimitUsd;
        uint256 liquidationValueWad;
        uint256 healthFactorWad; // (Liquidation Value / Debt) in WAD (1e18 = 100% health threshold)
        bool isLiquidatable;
        bool isClosed;
        bool isStale; // True if any collateral price is stale
        bool isValid; // True if all collaterals are valid
        bool isLiquidated;
        uint256 cumulativeBorrowed;
        uint256 cumulativeRepaid;
        uint64 liquidatedAt;
        uint64 openedAt;
        uint64 closedAt;
        CollateralDetail[] collaterals;
    }

    struct PortfolioSummary {
        uint256 totalPositionsCount;
        uint256 totalRawCollateralUsd;
        uint256 totalDebtUsd;
        uint256 liquidityBalance;
        uint256 totalCreditLimitUsd;
        uint256 totalLiquidationValueUsd;
        uint256 netBorrowingPowerUsd; // totalCreditLimitUsd - totalDebtUsd
        uint256 totalHealthFactorWad;
        uint256 weightedLtvBps;
        bool hasAtRiskPosition; // True if ANY position is liquidatable
        bool isStale; // True if any collateral price is stale
    }

    /// @notice Initializes the contract with the provided addresses.
    /// @param credditLine Address of the CreditLine contract.
    /// @param liquidityPool Address of the LiquidityPool contract.
    function initialize(
        address admin,
        address credditLine,
        address liquidityPool
    ) external initializer {
        if (
            admin == address(0) ||
            credditLine == address(0) ||
            liquidityPool == address(0)
        ) revert ZeroAddressProvided();

        __CredditCore_init(admin);

        cl = ICredditCreditLine(credditLine);
        lp = CredditLiquidityPool(liquidityPool);
    }

    /// @notice Fetches all position summaries belonging to a specific user address.
    /// @param user Address of the position owner.
    /// @return userPositions Array of PositionSummary structs owned by the user.
    function getUserPositions(
        address user
    ) public view returns (PositionSummary[] memory userPositions) {
        uint256[] memory posIds = cl.getUserPositions(user);
        uint256 totalCount = posIds.length;

        userPositions = new PositionSummary[](totalCount);

        for (uint256 i = 0; i < totalCount; i++) {
            userPositions[i] = _getPositionSummary(posIds[i]);
        }
    }

    /// @notice Fetches the aggregate portfolio summary and position details for a user.
    /// @param user Address of the user to query.
    /// @return summary PortfolioSummary containing total calculations and position array.
    function getUserPortfolioSummary(
        address user
    ) external view returns (PortfolioSummary memory summary) {
        PositionSummary[] memory positions = getUserPositions(user);
        uint256 totalCount = positions.length;

        summary.totalPositionsCount = totalCount;
        summary.liquidityBalance = lp.convertToAssets(lp.balanceOf(user));

        for (uint256 i = 0; i < totalCount; i++) {
            PositionSummary memory pos = positions[i];

            // Accumulate aggregate totals
            summary.totalRawCollateralUsd += pos.collateralValueWad;
            summary.totalDebtUsd += pos.debtWad;
            summary.totalCreditLimitUsd += pos.creditLimitUsd;
            summary.totalLiquidationValueUsd += pos.liquidationValueWad;

            if (pos.isLiquidatable) {
                summary.hasAtRiskPosition = true;
            }
            if (pos.isStale) {
                summary.isStale = true;
            }
        }

        if (summary.totalDebtUsd == 0) {
            summary.totalHealthFactorWad = type(uint256).max;
        } else {
            summary.totalHealthFactorWad = summary
                .totalLiquidationValueUsd
                .wadDivDown(summary.totalDebtUsd);
        }

        if (summary.totalRawCollateralUsd > 0) {
            uint256 ratioWad = summary.totalLiquidationValueUsd.wadDivDown(
                summary.totalRawCollateralUsd
            );
            summary.weightedLtvBps = ratioWad.wadToBpsDown();
        } else {
            summary.weightedLtvBps = 0;
        }

        // Calculate aggregate remaining borrow capacity
        if (summary.totalCreditLimitUsd > summary.totalDebtUsd) {
            summary.netBorrowingPowerUsd =
                summary.totalCreditLimitUsd -
                summary.totalDebtUsd;
        } else {
            summary.netBorrowingPowerUsd = 0;
        }
    }

    /// @notice Fetches a paginated batch of position summaries.
    function getPositionsBatch(
        uint256 startId,
        uint256 count
    ) external view returns (PositionSummary[] memory summaries) {
        uint256 maxId = cl.nextPositionId();
        if (startId > maxId || count == 0) return new PositionSummary[](0);

        uint256 endId = startId + count - 1;
        if (endId > maxId) {
            endId = maxId;
        }

        uint256 resultSize = endId - startId + 1;
        summaries = new PositionSummary[](resultSize);

        for (uint256 i = 0; i < resultSize; i++) {
            uint256 currentId = startId + i;
            summaries[i] = _getPositionSummary(currentId);
        }
    }

    /// @notice Returns only positions that are currently eligible for liquidation.
    function getLiquidatablePositions(
        uint256 startId,
        uint256 count
    ) external view returns (PositionSummary[] memory liquidatableSummaries) {
        PositionSummary[] memory batch = this.getPositionsBatch(startId, count);

        uint256 matchCount = 0;
        for (uint256 i = 0; i < batch.length; i++) {
            if (batch[i].isLiquidatable) {
                matchCount++;
            }
        }

        liquidatableSummaries = new PositionSummary[](matchCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < batch.length; i++) {
            if (batch[i].isLiquidatable) {
                liquidatableSummaries[idx] = batch[i];
                idx++;
            }
        }
    }

    /// @dev Internal helper to process a single position summary in its own stack frame
    function _getPositionSummary(
        uint256 currentId
    ) internal view returns (PositionSummary memory summary) {
        CredditRiskEngine riskEngine = cl.riskEngine();

        address owner = cl.getPositionOwner(currentId);
        if (owner == address(0)) return summary;

        Position memory pos = cl.positions(currentId);
        uint256 debtWad = cl.currentPositionDebt(currentId);

        (uint256 creditLimit, , ) = riskEngine.creditLimitSafe(
            address(cl),
            currentId
        );
        (uint256 liqVal, , ) = riskEngine.liquidationValue(
            address(cl),
            currentId,
            true
        );
        bool liquidatable = riskEngine.isLiquidatableSafe(
            address(cl),
            currentId,
            debtWad
        );

        uint256 healthFactor = debtWad == 0
            ? type(uint256).max
            : liqVal.wadDivDown(debtWad);

        (
            CollateralDetail[] memory collaterals,
            uint256 collateralValueWad,
            bool isStale,
            bool isValid
        ) = _getCollaterals(currentId);

        return
            PositionSummary({
                positionId: currentId,
                owner: owner,
                debtWad: debtWad,
                collateralValueWad: collateralValueWad,
                creditLimitUsd: creditLimit,
                liquidationValueWad: liqVal,
                healthFactorWad: healthFactor,
                isLiquidatable: liquidatable,
                isStale: isStale,
                isValid: isValid,
                collaterals: collaterals,
                isClosed: pos.isClosed,
                isLiquidated: pos.isLiquidated,
                cumulativeBorrowed: pos.cumulativeBorrowed,
                cumulativeRepaid: pos.cumulativeRepaid,
                liquidatedAt: pos.liquidatedAt,
                openedAt: pos.openedAt,
                closedAt: pos.closedAt
            });
    }

    /// @dev Internal helper to fetch position active collateral details via positionAssets
    function _getCollaterals(
        uint256 positionId
    )
        internal
        view
        returns (
            CollateralDetail[] memory collaterals,
            uint256 collateralValueWad,
            bool isStale,
            bool isValid
        )
    {
        address[] memory assets = cl.getPositionAssets(positionId);
        uint256 numAssets = assets.length;
        isValid = true;

        collaterals = new CollateralDetail[](numAssets);

        for (uint256 i = 0; i < numAssets; i++) {
            // Scope oracle return variables to free stack slots immediately
            uint256 priceWad;
            {
                bool _isStale;
                bool _isValid;
                (priceWad, _isStale, _isValid) = cl.oracle().getUsdPriceSafe(
                    assets[i]
                );

                if (_isStale) isStale = true;
                if (!_isValid) isValid = false;
            }

            uint256 amount = cl.collateralOf(positionId, assets[i]);

            collaterals[i] = CollateralDetail({
                symbol: IERC20Metadata(assets[i]).symbol(),
                asset: assets[i],
                amount: amount,
                priceInUsd: priceWad
            });

            // Compute and accumulate WAD USD value directly
            collateralValueWad += amount
                .toWad(IERC20Metadata(assets[i]).decimals())
                .wadMulDown(priceWad);
        }
    }

    function _assetValue(
        address token,
        uint256 amount
    ) internal view returns (uint256 amountWad, uint256 valueWad) {
        IPriceOracle oracle = cl.oracle();
        (uint256 priceWad, , ) = oracle.getUsdPriceSafe(token);
        uint8 decimals = IERC20Metadata(token).decimals();

        amountWad = amount.toWad(decimals);
        valueWad = amountWad.wadMulDown(priceWad);
    }
}
