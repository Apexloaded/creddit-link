import { Stock } from "@/config";
import { FormattedAmount } from "./asset.interface";

export interface ICollateral {
  symbol: Stock;
  asset: string;
  value: FormattedAmount;
}

export interface IPosition {
  id: number;
  owner: string;
  debt: FormattedAmount;
  collateralUsd: FormattedAmount;
  creditLimitUsd: FormattedAmount;
  liquidationValueUsd: FormattedAmount;
  isInfiniteHealth: boolean;
  isClosed: boolean;
  isLiquidated: boolean;
  cumulativeBorrowed: FormattedAmount;
  cumulativeRepaid: FormattedAmount;
  healthFactor: FormattedAmount;
  isLiquidatable: boolean;
  collaterals: ICollateral[];
  liquidatedAt: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
}

export interface IPortfolio {
  totalPositions: number;
  collateralUsd: FormattedAmount;
  debtUsd: FormattedAmount;
  liquidityBalance: FormattedAmount;
  creditLimitUsd: FormattedAmount;
  liquidationValueUsd: FormattedAmount;
  netBorrowingPowerUsd: FormattedAmount;
  totalHealthFactorWad: number;
  hasAtRiskPosition: boolean;
  weightedLtvBps: number;
  isStale: boolean;
}
