"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useReadContract, useWriteContractSync } from "wagmi";
import {
  Address,
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  zeroAddress,
} from "viem";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { Contracts } from "@/config/contract.config";
import { assetRegistryAbi } from "@/contracts/abis/assetRegistryAbi";
import { RawAssetConfig } from "@/contracts/interfaces/asset-registry";
import { useCredditAddresses } from "./use-creddit-addresses";

export interface AddAssetParams {
  token: Address;
  collateralFactorBps: number;
  liquidationThresholdBps: number;
  liquidationPenaltyBps: number;
  liquidationBonusBps: number;
  maxExposure: bigint;
  decimals: number;
}

const MAX_COLLATERAL_FACTOR_BPS = 8_500;
const MIN_SAFETY_MARGIN_BPS = 500;
const MIN_LIQUIDATION_PENALTY_BPS = 200;
const MAX_LIQUIDATION_PENALTY_BPS = 1_500;
const MAX_BPS = 10_000;

export function useCredditAssetRegistry() {
  const { getContract } = useCredditAddresses();
  const registryAddress = getContract(Contracts.REGISTRY);

  function useGetAsset(tokenAddress?: Address) {
    return useReadContract({
      address: registryAddress,
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

  function useListAssets(onlyEnabled = true) {
    return useReadContract({
      address: registryAddress,
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
    });
  }

  function useAddAsset() {
    const config = useConfig();
    const queryClient = useQueryClient();
    const { mutateAsync } = useWriteContractSync();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const addAsset = async ({
      token,
      collateralFactorBps,
      liquidationThresholdBps,
      liquidationPenaltyBps,
      liquidationBonusBps,
      maxExposure,
      decimals,
    }: AddAssetParams) => {
      setError(null);

      try {
        if (!registryAddress) throw new Error("Registry address not available");
        if (!isAddress(token) || token === zeroAddress) {
          throw new Error("Enter a valid token address");
        }
        if (maxExposure <= BigInt(0)) {
          throw new Error("Max exposure must be greater than zero");
        }
        if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
          throw new Error("Decimals must be an integer between 0 and 30");
        }
        if (collateralFactorBps <= 0 || liquidationThresholdBps <= 0) {
          throw new Error(
            "Collateral factor and liquidation threshold are required",
          );
        }
        if (collateralFactorBps > MAX_COLLATERAL_FACTOR_BPS) {
          throw new Error("Collateral factor cannot exceed 8500 BPS");
        }
        if (
          liquidationThresholdBps <
          collateralFactorBps + MIN_SAFETY_MARGIN_BPS
        ) {
          throw new Error(
            "Liquidation threshold must be at least 500 BPS above collateral factor",
          );
        }
        if (liquidationThresholdBps > MAX_BPS) {
          throw new Error("Liquidation threshold cannot exceed 10000 BPS");
        }
        if (
          liquidationPenaltyBps < MIN_LIQUIDATION_PENALTY_BPS ||
          liquidationPenaltyBps > MAX_LIQUIDATION_PENALTY_BPS
        ) {
          throw new Error(
            "Liquidation penalty must be between 200 and 1500 BPS",
          );
        }
        if (liquidationBonusBps > liquidationPenaltyBps) {
          throw new Error(
            "Liquidation bonus cannot exceed the liquidation penalty",
          );
        }

        setIsProcessing(true);

        const args = [
          token,
          collateralFactorBps,
          liquidationThresholdBps,
          liquidationPenaltyBps,
          liquidationBonusBps,
          maxExposure,
          decimals,
        ] as const;

        try {
          await simulateContract(config, {
            address: registryAddress,
            abi: assetRegistryAbi,
            functionName: "addAsset",
            args,
          });
        } catch (e) {
          if (e instanceof BaseError) {
            const rev = e.walk(
              (x) => x instanceof ContractFunctionRevertedError,
            );
            if (rev instanceof ContractFunctionRevertedError) {
              console.error(
                "addAsset would revert:",
                rev.data?.errorName,
                rev.data?.args,
              );
            }
          }
          throw e;
        }

        const result = await mutateAsync({
          address: registryAddress,
          abi: assetRegistryAbi,
          functionName: "addAsset",
          args,
        });

        const receipt = await waitForTransactionReceipt(config, {
          hash: result.transactionHash,
        });
        if (receipt.status !== "success") {
          throw new Error("addAsset transaction reverted on-chain");
        }

        await queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "readContract",
        });

        return receipt;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsProcessing(false);
      }
    };

    return { addAsset, isProcessing, error };
  }

  function useRemoveAsset() {
    const config = useConfig();
    const queryClient = useQueryClient();
    const { mutateAsync } = useWriteContractSync();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const removeAsset = async (token: Address) => {
      setError(null);

      try {
        if (!registryAddress) throw new Error("Registry address not available");
        if (!isAddress(token) || token === zeroAddress) {
          throw new Error("Enter a valid token address");
        }

        setIsProcessing(true);
        const args = [token] as const;

        try {
          await simulateContract(config, {
            address: registryAddress,
            abi: assetRegistryAbi,
            functionName: "removeAsset",
            args,
          });
        } catch (e) {
          if (e instanceof BaseError) {
            const rev = e.walk(
              (x) => x instanceof ContractFunctionRevertedError,
            );
            if (rev instanceof ContractFunctionRevertedError) {
              console.error(
                "removeAsset would revert:",
                rev.data?.errorName,
                rev.data?.args,
              );
            }
          }
          throw e;
        }

        const result = await mutateAsync({
          address: registryAddress,
          abi: assetRegistryAbi,
          functionName: "removeAsset",
          args,
        });

        const receipt = await waitForTransactionReceipt(config, {
          hash: result.transactionHash,
        });
        if (receipt.status !== "success") {
          throw new Error("removeAsset transaction reverted on-chain");
        }

        await queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "readContract",
        });

        return receipt;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsProcessing(false);
      }
    };

    return { removeAsset, isProcessing, error };
  }

  return {
    useGetAsset,
    useListAssets,
    useAddAsset,
    useRemoveAsset,
  };
}
