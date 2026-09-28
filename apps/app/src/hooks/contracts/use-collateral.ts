"use client";

import { useMemo } from "react";
import {
  CREDDIT_PROTOCOL_ADDRESSES,
  ORACLE_PRICE_DECIMALS,
} from "@/config/contract.config";
import { credditCreditLineAbi } from "@/contracts/abis/credditCreditLineAbi";
import { Address, formatUnits } from "viem";
import { useReadContracts, useConnection } from "wagmi";
import { credditOracleAbi } from "@/contracts/abis/credditOracleAbi";
import { IAsset } from "@/interfaces/asset.interface";

const CREDIT_LINE_ADDRESS = CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE as Address;
const ORACLE_ADDRESS = CREDDIT_PROTOCOL_ADDRESSES.ORACLE as Address;

export type CollateralPosition = {
  asset: Address;
  balance: bigint;
  usdPrice: bigint;
  usdPriceFormatted: string;
  usdValue: bigint;
  isPriceStale: boolean;
};

export function useCollateralOf(assets: IAsset[]) {
  const { address: userAddress } = useConnection();

  const contracts = useMemo(() => {
    if (!userAddress || assets.length === 0) {
      return [];
    }

    return assets.flatMap((asset) => [
      {
        address: CREDIT_LINE_ADDRESS,
        abi: credditCreditLineAbi,
        functionName: "collateralOf" as const,
        args: [userAddress, asset.token] as const,
      },
      {
        address: ORACLE_ADDRESS,
        abi: credditOracleAbi,
        functionName: "getUsdPriceSafe" as const,
        args: [asset.token] as const,
      },
    ]);
  }, [assets, userAddress]);

  const query = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(userAddress && assets.length > 0),
      staleTime: 1000 * 60 * 5,
    },
  });

  const positions = useMemo<CollateralPosition[]>(() => {
    if (!query.data) {
      return [];
    }

    return assets
      .map((asset, index) => {
        const balanceCall = query.data[index * 2];
        const priceCall = query.data[index * 2 + 1];

        if (
          balanceCall?.status !== "success" ||
          priceCall?.status !== "success"
        ) {
          return null;
        }

        const balance = balanceCall.result as bigint;
        const [rawPrice = BigInt(0), isStale = false, isValid = false] =
          (priceCall.result as [bigint, boolean, boolean]) ?? [];

        const assetDecimals = asset.decimals;

        // Correct combination of a token balance with a price: dividing by
        // the asset's own decimals leaves the result expressed in the
        // oracle's price decimals (see ORACLE_PRICE_DECIMALS above) — do
        // not also divide by the price decimals here, that double-counts.
        const usdValue =
          (balance * rawPrice) / BigInt(10) ** BigInt(assetDecimals);

        return {
          asset: asset.token,
          balance,
          usdPrice: rawPrice,
          usdPriceFormatted: formatUnits(rawPrice, ORACLE_PRICE_DECIMALS),
          usdValue,
          isPriceStale: isStale,
        };
      })
      .filter(
        (position): position is CollateralPosition =>
          position?.balance !== BigInt(0),
      );
  }, [assets, query.data]);

  const totalUsdValue = useMemo(
    () =>
      positions.reduce(
        (total, position) => total + position.usdValue,
        BigInt(0),
      ),
    [positions],
  );

  // Surfaced separately so callers can decide how to react (e.g. block a
  // borrow or liquidation) without having to scan every position.
  const hasStalePrice = useMemo(
    () => positions.some((position) => position.isPriceStale),
    [positions],
  );

  return {
    positions,
    totalUsdValue: formatUnits(totalUsdValue, ORACLE_PRICE_DECIMALS),
    hasStalePrice,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
