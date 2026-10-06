import { Stock } from "@/config";
import { RawAssetConfig } from "@/contracts/interfaces/asset-registry";

export interface FormattedAmount {
  raw: bigint;
  formatted: string;
}
export interface IAsset extends Omit<RawAssetConfig, "maxExposure"> {
  symbol: Stock;
  balance: bigint;
  balanceFormatted: string;
  maxExposure: string;
  usdPrice: string;
  isPriceError: boolean;
  isStale: boolean;
}
