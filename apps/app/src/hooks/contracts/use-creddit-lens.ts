"use client";

import { ContractFunctionReturnType } from "viem";
import { useConnection, useReadContract } from "wagmi";
import {
  CREDDIT_PROTOCOL_ADDRESSES,
  ORACLE_PRICE_DECIMALS,
  Stock,
  TOKEN_DECIMALS,
} from "@/config";
import { credditLensAbi } from "@/contracts/abis/credditLensAbi";
import { IPortfolio, IPosition } from "@/interfaces/creddit-lens.interface";
import { fromBlockDate, toFormattedAmount } from "@/lib/utils";

export type RawPortfolioSummary = ContractFunctionReturnType<
  typeof credditLensAbi,
  "view",
  "getUserPortfolioSummary"
>;

export type RawPositionSummary = ContractFunctionReturnType<
  typeof credditLensAbi,
  "view",
  "getUserPositions"
>[number];

export type RawCollateralDetail = RawPositionSummary["collaterals"][number];

export function useCredditLens() {
  const { address } = useConnection();
  const lensAddress = CREDDIT_PROTOCOL_ADDRESSES.LENS;

  /**
   * 1. Fetch user's full portfolio summary
   */
  const useUserPortfolio = () => {
    return useReadContract({
      address: lensAddress,
      abi: credditLensAbi,
      functionName: "getUserPortfolioSummary",
      args: [address!],
      query: {
        enabled: Boolean(address),
        select: (data): IPortfolio => parsePortfolioSummary(data),
      },
    });
  };

  /**
   * 2. Fetch only user's position summaries
   */
  const useUserPositions = () => {
    return useReadContract({
      address: lensAddress,
      abi: credditLensAbi,
      functionName: "getUserPositions",
      args: [address!],
      query: {
        enabled: Boolean(address),
        // staleTime: 1000 * 60 * 5,
        select: (data): IPosition[] =>
          data.map((pos) => parsePositionSummary(pos)),
      },
    });
  };

  /**
   * 3. Fetch a paginated batch of positions (e.g., for protocol analytics)
   */
  const usePositionsBatch = (startId: bigint, count: bigint) => {
    return useReadContract({
      address: lensAddress,
      abi: credditLensAbi,
      functionName: "getPositionsBatch",
      args: [startId, count],
      query: {
        enabled: count > BigInt(0),
        staleTime: 1000 * 60 * 5,
        select: (data): IPosition[] =>
          data.map((pos) => parsePositionSummary(pos)),
      },
    });
  };

  /**
   * 4. Fetch liquidatable positions (for liquidator bots / risk dashboards)
   */
  const useLiquidatablePositions = (startId: bigint, count: bigint) => {
    return useReadContract({
      address: lensAddress,
      abi: credditLensAbi,
      functionName: "getLiquidatablePositions",
      args: [startId, count],
      query: {
        enabled: count > BigInt(0),
        staleTime: 1000 * 30, // Shorter stale time for liquidations
        select: (data): IPosition[] =>
          data.map((pos) => parsePositionSummary(pos)),
      },
    });
  };

  return {
    useUserPortfolio,
    useUserPositions,
    usePositionsBatch,
    useLiquidatablePositions,
  };
}

function parsePositionSummary(pos: RawPositionSummary): IPosition {
  const isInfiniteHealth =
    pos.healthFactorWad === BigInt(2) ** BigInt(256) - BigInt(1);

  return {
    id: Number(pos.positionId),
    owner: pos.owner,
    debt: toFormattedAmount(pos.debtWad),
    collateralUsd: toFormattedAmount(pos.collateralValueWad),
    creditLimitUsd: toFormattedAmount(pos.creditLimitUsd),
    liquidationValueUsd: toFormattedAmount(pos.liquidationValueWad),
    healthFactor: toFormattedAmount(
      pos.healthFactorWad,
      ORACLE_PRICE_DECIMALS,
      isInfiniteHealth ? "∞" : undefined,
    ),
    isInfiniteHealth,
    isLiquidatable: pos.isLiquidatable,
    collaterals: pos.collaterals.map((col) => ({
      symbol: col.symbol as Stock,
      asset: col.asset,
      value: toFormattedAmount(col.amount),
    })),
    isClosed: pos.isClosed,
    isLiquidated: pos.isLiquidated,
    cumulativeBorrowed: toFormattedAmount(
      pos.cumulativeBorrowed,
      TOKEN_DECIMALS.USDG,
    ),
    cumulativeRepaid: toFormattedAmount(
      pos.cumulativeRepaid,
      TOKEN_DECIMALS.USDG,
    ),
    liquidatedAt: fromBlockDate(pos.liquidatedAt),
    openedAt: fromBlockDate(pos.openedAt),
    closedAt: fromBlockDate(pos.closedAt),
  };
}

function parsePortfolioSummary(data: RawPortfolioSummary): IPortfolio {
  return {
    totalPositions: Number(data.totalPositionsCount),
    collateralUsd: toFormattedAmount(data.totalRawCollateralUsd),
    debtUsd: toFormattedAmount(data.totalDebtUsd),
    creditLimitUsd: toFormattedAmount(data.totalCreditLimitUsd),
    liquidationValueUsd: toFormattedAmount(data.totalLiquidationValueUsd),
    netBorrowingPowerUsd: toFormattedAmount(data.netBorrowingPowerUsd),
    hasAtRiskPosition: data.hasAtRiskPosition,
    isStale: data.isStale,
    liquidityBalance: toFormattedAmount(
      data.liquidityBalance,
      TOKEN_DECIMALS.USDG,
    ),
    totalHealthFactorWad: Number(data.totalHealthFactorWad),
    weightedLtvBps: Number(data.weightedLtvBps),
  };
}
