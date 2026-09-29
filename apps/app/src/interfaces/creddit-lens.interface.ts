import { FormattedAmount } from "./asset.interface";

export interface ICollateral {
  symbol: string;
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
  healthFactor: FormattedAmount;
  isLiquidatable: boolean;
  collaterals: ICollateral[];
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
