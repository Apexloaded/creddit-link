"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useCredditAddresses, useCredditAssetRegistry } from "./contracts";
import { bpsToRawPercent } from "@/lib/utils";
import { Address, erc20Abi, formatUnits } from "viem";
import { useConnection, useReadContracts } from "wagmi";
import { Contracts, ORACLE_PRICE_DECIMALS } from "@/config/contract.config";
import { credditOracleAbi } from "@/contracts/abis/credditOracleAbi";
import { IAsset } from "@/interfaces/asset.interface";

export function useAsset() {
  const { address } = useConnection();
  const { getContract } = useCredditAddresses();
  const oracleAddress = getContract(Contracts.ORACLE);
  const { useListAssets } = useCredditAssetRegistry();
  const [selectedAsset, setSelectedAsset] = useState<IAsset | undefined>();
  const [assets, setAssets] = useState<IAsset[]>([]);

  // Track if user explicitly picked an asset so we don't overwrite their pick
  const isUserSelectedRef = useRef(false);

  const { data: rawAssets, isLoading: isRawListLoading } = useListAssets(true);

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
      staleTime: Infinity,
      gcTime: 1_000 * 60 * 60,
    },
  });

  // Map static symbols to assets ONLY once symbolsData is actually present
  const staticAssets = useMemo(() => {
    if (!rawAssets || !symbolsData || symbolsData.length === 0) return [];

    return rawAssets.map((asset, index) => {
      const symResult = symbolsData?.[index]?.result;
      return {
        ...asset,
        symbol: typeof symResult === "string" ? symResult : "",
      };
    });
  }, [rawAssets, symbolsData]);

  // Combined asset list loading state
  const isListLoading =
    isRawListLoading ||
    (!!rawAssets && rawAssets.length > 0 && (!symbolsData || isSymbolsLoading));

  // -------------------------------------------------------------------------
  // 2. DYNAMIC FETCH: Balances & Prices
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
        address: oracleAddress as Address,
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
      refetchInterval: 12_000,
    },
  });

  // -------------------------------------------------------------------------
  // Wrapper for setSelectedAsset to track manual user selection
  // -------------------------------------------------------------------------
  const handleSelectAsset = (asset: IAsset | undefined) => {
    isUserSelectedRef.current = true;
    setSelectedAsset(asset);
  };

  // -------------------------------------------------------------------------
  // 3. COMBINE STATIC & DYNAMIC DATA INTO FINAL STATE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (staticAssets.length > 0 && staticAssets.every((a) => a.symbol !== "")) {
      const mapRawAssets: IAsset[] = staticAssets.map((asset, index) => {
        const balanceCall = dynamicData?.[index * 2];
        const priceCall = dynamicData?.[index * 2 + 1];

        const balance = (balanceCall?.result as bigint) ?? BigInt(0);
        const balanceFormatted = formatUnits(balance, asset.decimals);

        const isPriceError =
          priceCall?.status === "failure" || !priceCall?.result;

        const [rawPrice = BigInt(0), isStale = false] =
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
        // Calculate highest total USD value
        const highestValuedAsset = mapRawAssets.reduce((highest, current) => {
          const highestVal =
            parseFloat(highest.balanceFormatted || "0") *
            parseFloat(highest.usdPrice || "0");

          const currentVal =
            parseFloat(current.balanceFormatted || "0") *
            parseFloat(current.usdPrice || "0");

          return currentVal > highestVal ? current : highest;
        }, mapRawAssets[0]);

        // Auto-select rules:
        // 1. If user manually selected an asset, maintain their selection.
        // 2. If data hasn't loaded dynamic balances yet, pick highest valued (or first).
        // 3. If dynamicData has arrived and user hasn't manually selected, set the highest valued asset.
        if (isUserSelectedRef.current) {
          setSelectedAsset(
            (prev) =>
              mapRawAssets.find((a) => a.token === prev?.token) ??
              highestValuedAsset,
          );
        } else {
          setSelectedAsset(highestValuedAsset);
        }
      }
    }
  }, [staticAssets, dynamicData]);

  return {
    assets,
    selectedAsset,
    setSelectedAsset: handleSelectAsset,
    isListLoading,
    isDynamicLoading,
  };
}