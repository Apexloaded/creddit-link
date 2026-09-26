"use client";

import { useEffect, useMemo, useState } from "react";
import { useListAssets } from "./contracts";
import { bpsToRawPercent } from "@/lib/utils";
import { Address, erc20Abi, formatUnits } from "viem";
import { useConnection, useReadContracts } from "wagmi";
import {
  CREDDIT_PROTOCOL_ADDRESSES,
  ORACLE_PRICE_DECIMALS,
} from "@/config/contract.config";
import { credditOracleAbi } from "@/contracts/abis/credditOracleAbi";
import { IAsset } from "@/interfaces/asset.interface";

function useAsset() {
  const { address } = useConnection();
  const [selectedAsset, setSelectedAsset] = useState<IAsset | undefined>();
  const [assets, setAssets] = useState<IAsset[]>([]);

  const { data: rawAssets, isLoading: isListLoading } = useListAssets(true);

  // -------------------------------------------------------------------------
  // 1. STATIC FETCH: Symbols (Executed ONCE per asset list load)
  // -------------------------------------------------------------------------
  const symbolContracts = useMemo(() => {
    if (!rawAssets) return [];
    return rawAssets.map((asset) => ({
      address: asset.token as Address,
      abi: erc20Abi,
      functionName: "symbol" as const,
    }));
  }, [rawAssets]);

  const { data: symbolsData, isLoading: isSymbolsLoading } = useReadContracts({
    contracts: symbolContracts,
    query: {
      enabled: !!rawAssets && rawAssets.length > 0,
      staleTime: Infinity, // Never automatically re-query symbols
      gcTime: 1_000 * 60 * 60, // Cache for 1 hour
    },
  });

  // Map static symbols to assets once available
  const staticAssets = useMemo(() => {
    if (!rawAssets) return [];
    return rawAssets.map((asset, index) => ({
      ...asset,
      symbol: (symbolsData?.[index]?.result as string) ?? "",
    }));
  }, [rawAssets, symbolsData]);

  // -------------------------------------------------------------------------
  // 2. DYNAMIC FETCH: Balances & Prices (Polled every 12 seconds)
  // -------------------------------------------------------------------------
  const dynamicContracts = useMemo(() => {
    if (!staticAssets.length || !address) return [];
    return staticAssets.flatMap((asset) => [
      {
        address: asset.token as Address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address],
      },
      {
        address: CREDDIT_PROTOCOL_ADDRESSES.ORACLE as Address,
        abi: credditOracleAbi,
        functionName: "getUsdPriceSafe" as const,
        args: [asset.token],
      },
    ]);
  }, [staticAssets, address]);

  const { data: dynamicData, isLoading: isDynamicLoading } = useReadContracts({
    contracts: dynamicContracts,
    query: {
      enabled: dynamicContracts.length > 0,
      refetchInterval: 12_000, // Poll every 12s (1 block) for prices/balances only
      // staleTime: 10_000,
    },
  });

  // -------------------------------------------------------------------------
  // 3. COMBINE STATIC & DYNAMIC DATA INTO FINAL STATE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (staticAssets.length > 0) {
      const mapRawAssets: IAsset[] = staticAssets.map((asset, index) => {
        // Dynamic index pairs (2 calls per asset: 0 = balance, 1 = price)
        const balanceCall = dynamicData?.[index * 2];
        const priceCall = dynamicData?.[index * 2 + 1];

        const balance = (balanceCall?.result as bigint) ?? BigInt(0);
        const balanceFormatted = formatUnits(balance, asset.decimals);

        const isPriceError =
          priceCall?.status === "failure" || !priceCall?.result;

        const [rawPrice = BigInt(0), isStale = false, isValid = false] =
          (priceCall?.result as [bigint, boolean, boolean]) ?? [];

        const usdPriceFormatted = formatUnits(rawPrice, ORACLE_PRICE_DECIMALS);

        return {
          ...asset,
          balance,
          balanceFormatted,
          collateralFactorBps: bpsToRawPercent(asset.collateralFactorBps),
          liquidationThresholdBps: bpsToRawPercent(
            asset.liquidationThresholdBps,
          ),
          liquidationPenaltyBps: bpsToRawPercent(asset.liquidationPenaltyBps),
          liquidationBonusBps: bpsToRawPercent(asset.liquidationBonusBps),
          maxExposure: formatUnits(asset.maxExposure, asset.decimals),
          usdPrice: usdPriceFormatted,
          isPriceError,
          isStale,
        };
      });

      setAssets(mapRawAssets);

      if (mapRawAssets.length > 0) {
        setSelectedAsset((prev) =>
          prev
            ? (mapRawAssets.find((a) => a.token === prev.token) ??
              mapRawAssets[0])
            : mapRawAssets[0],
        );
      }
    }
  }, [staticAssets, dynamicData]);

  return {
    assets,
    selectedAsset,
    setSelectedAsset,
    isListLoading: isListLoading || isSymbolsLoading,
    isDynamicLoading,
  };
}

export default useAsset;
