"use client";

import { useState } from "react";
import { useConfig, useReadContract, useWriteContractSync } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  zeroAddress,
  type Address,
} from "viem";
import { Contracts } from "@/config";
import { useCredditAddresses } from "./use-creddit-addresses";
import { credditOracleAbi } from "@/contracts/abis/credditOracleAbi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";

/** Mirrors CredditOracle.MIN/MAX_STALENESS_THRESHOLD */
export const MIN_STALENESS_SECONDS = 60; // 1 minute
export const MAX_STALENESS_SECONDS = 86_400; // 24 hours

export interface SetFeedParams {
  /** Chainlink-compatible aggregator address */
  feed: Address;
  /** Token the feed prices (e.g. USDG) */
  asset: Address;
  /** Staleness threshold in seconds (60 – 86400) */
  stalenessThreshold: number | bigint;
}

export function useCredditOracle() {
  const { getContract } = useCredditAddresses();
  const oracleAddress = getContract(Contracts.ORACLE);

  /**
   * 1. Fetch the USD price of a token via the oracle's non-reverting getter.
   * @returns { usd: WAD price, isStale, isValid }
   * NOTE: getUsdPriceSafe still reverts with FeedNotConfigured / FeedDisabled
   * when no feed exists, so `error` is how you detect a missing feed.
   */
  const useGetUsdPrice = (tokenAddress: Address | undefined) => {
    return useReadContract({
      address: oracleAddress,
      abi: credditOracleAbi,
      functionName: "getUsdPriceSafe",
      args: [tokenAddress!],
      query: {
        enabled: Boolean(tokenAddress),
        staleTime: 1000 * 30,
        select: ([priceWad, isStale, isValid]) => ({
          usd: priceWad,
          isStale,
          isValid,
        }),
      },
    });
  };

  /**
   * 2. Fetch the feed configuration for a token.
   * @returns { asset, stalenessThreshold, enabled, feed }
   * `feed === zeroAddress` means the token has no feed configured.
   */
  const useGetFeed = (tokenAddress: Address | undefined) => {
    return useReadContract({
      address: oracleAddress,
      abi: credditOracleAbi,
      functionName: "getFeed",
      args: [tokenAddress!],
      query: {
        enabled: Boolean(tokenAddress),
        staleTime: 1000 * 60,
        select: (cfg) => ({
          ...cfg,
          isConfigured: cfg.feed !== zeroAddress,
        }),
      },
    });
  };

  /**
   * 3. Configure the price feed for an asset (requires ASSET_ADMIN_ROLE).
   * Simulates first so the real revert reason is surfaced, then sends the tx.
   */
  const useSetFeed = () => {
    const config = useConfig();
    const queryClient = useQueryClient();
    const { mutateAsync } = useWriteContractSync();

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const setFeed = async ({
      feed,
      asset,
      stalenessThreshold,
    }: SetFeedParams) => {
      setError(null);

      try {
        if (!oracleAddress) throw new Error("Oracle address not available");
        if (!isAddress(feed) || feed === zeroAddress)
          throw new Error("Invalid feed address");
        if (!isAddress(asset) || asset === zeroAddress)
          throw new Error("Invalid asset address");

        const threshold = BigInt(stalenessThreshold);
        if (
          threshold < BigInt(MIN_STALENESS_SECONDS) ||
          threshold > BigInt(MAX_STALENESS_SECONDS)
        ) {
          throw new Error(
            `Staleness threshold must be between ${MIN_STALENESS_SECONDS}s and ${MAX_STALENESS_SECONDS}s`,
          );
        }

        setIsProcessing(true);

        const args = [feed, asset, threshold] as const;

        // Surfaces AccessControlUnauthorizedAccount, EnforcedPause, etc. before MetaMask opens
        try {
          await simulateContract(config, {
            address: oracleAddress,
            abi: credditOracleAbi,
            functionName: "setFeed",
            args,
          });
        } catch (e) {
          if (e instanceof BaseError) {
            const rev = e.walk(
              (x) => x instanceof ContractFunctionRevertedError,
            );
            if (rev instanceof ContractFunctionRevertedError) {
              console.error(
                "setFeed would revert:",
                rev.data?.errorName,
                rev.data?.args,
              );
            }
          }
          throw e;
        }

        const result = await mutateAsync({
          address: oracleAddress,
          abi: credditOracleAbi,
          functionName: "setFeed",
          args,
        });

        const receipt = await waitForTransactionReceipt(config, {
          hash: result.transactionHash,
        });
        if (receipt.status !== "success") {
          throw new Error("setFeed transaction reverted on-chain");
        }

        // Refresh every wagmi read (getFeed, getUsdPriceSafe, credit limits, ...)
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

    return { setFeed, isProcessing, error };
  };

  return {
    useGetUsdPrice,
    useGetFeed,
    useSetFeed,
  };
}
