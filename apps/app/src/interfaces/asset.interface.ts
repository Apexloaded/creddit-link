import { RawAssetConfig } from "@/contracts/interfaces/asset-registry";

export interface IAsset extends Omit<RawAssetConfig, "maxExposure"> {
  symbol: string;
  balance: bigint;
  balanceFormatted: string;
  maxExposure: string;
  usdPrice: string;
  isPriceError: boolean;
  isStale: boolean;
}
