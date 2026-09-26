import { Address } from "viem";

export interface RawAssetConfig {
  token: Address;
  collateralFactorBps: number;
  liquidationThresholdBps: number;
  liquidationPenaltyBps: number;
  liquidationBonusBps: number;
  maxExposure: bigint;
  decimals: number;
  isEnabled: boolean;
  isListed: boolean;
}