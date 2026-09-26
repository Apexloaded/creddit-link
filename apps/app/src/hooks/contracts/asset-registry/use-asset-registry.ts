"use client";

import { useReadContract } from "wagmi";
import { Address } from "viem";
import { CREDDIT_PROTOCOL_ADDRESSES } from "@/config/contract.config";
import { assetRegistryAbi } from "@/contracts/abis/assetRegistryAbi";
import { RawAssetConfig } from "@/contracts/interfaces/asset-registry";
import { hardhat } from "viem/chains";

export function useGetAsset(tokenAddress?: Address) {
  return useReadContract({
    address: CREDDIT_PROTOCOL_ADDRESSES.REGISTRY,
    abi: assetRegistryAbi,
    functionName: "getAsset",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 1000 * 60 * 5,
      select: (data): RawAssetConfig => ({
        token: data.token,
        collateralFactorBps: Number(data.collateralFactorBps),
        liquidationThresholdBps: Number(data.liquidationThresholdBps),
        liquidationPenaltyBps: Number(data.liquidationPenaltyBps),
        liquidationBonusBps: Number(data.liquidationBonusBps),
        maxExposure: data.maxExposure,
        decimals: Number(data.decimals),
        isEnabled: data.isEnabled,
        isListed: data.isListed,
      }),
    },
  });
}

export function useListAssets(onlyEnabled = true) {
  return useReadContract({
    address: CREDDIT_PROTOCOL_ADDRESSES.REGISTRY,
    abi: assetRegistryAbi,
    functionName: "listAssets",
    args: [onlyEnabled],
    query: {
      staleTime: 1000 * 60 * 5,
      select: (data): RawAssetConfig[] =>
        data.map((item) => ({
          token: item.token,
          collateralFactorBps: Number(item.collateralFactorBps),
          liquidationThresholdBps: Number(item.liquidationThresholdBps),
          liquidationPenaltyBps: Number(item.liquidationPenaltyBps),
          liquidationBonusBps: Number(item.liquidationBonusBps),
          maxExposure: item.maxExposure,
          decimals: Number(item.decimals),
          isEnabled: item.isEnabled,
          isListed: item.isListed,
        })),
    },
    chainId: hardhat.id
  });
}
