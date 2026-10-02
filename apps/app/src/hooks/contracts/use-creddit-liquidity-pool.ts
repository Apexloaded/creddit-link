"use client";

import { useCallback, useState } from "react";
import {
  useConfig,
  useConnection,
  useReadContracts,
  useWriteContractSync,
} from "wagmi";
import { useErc20Details } from "./use-erc20";
import { Contracts, TOKEN_DECIMALS, Tokens } from "@/config/contract.config";
import { cleanPrice, parseAmount } from "@/lib/utils";
import { credditLiquidityPoolAbi } from "@/contracts/abis/credditLiquidityPoolAbi";
import { erc20Abi } from "@/contracts/abis/erc20Abi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits } from "viem";
import { useCredditAddresses } from "./use-creddit-addresses";
import { useQueryClient } from "@tanstack/react-query";

export function useCredditLiquidityPool() {
  const { getContract, getToken } = useCredditAddresses();
  const credditLiquidityPoolAddress = getContract(Contracts.LIQUIDITY_POOL);
  const usdgTokenAddress = getToken(Tokens.USDG);
  const queryClient = useQueryClient();

  function useDeposit() {
    const { address } = useConnection();
    const config = useConfig();
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepStatus, setStepStatus] = useState<
      "idle" | "approving" | "depositing"
    >("idle");
    const [error, setError] = useState<Error | null>(null);

    const { decimals, allowance, refetch } = useErc20Details(
      usdgTokenAddress,
      credditLiquidityPoolAddress,
    );

    const { mutateAsync } = useWriteContractSync();

    const deposit = useCallback(
      async (amount: string) => {
        const cleanAmount = cleanPrice(amount, true);
        const parsedAmount = parseAmount(cleanAmount, decimals);
        if (!usdgTokenAddress || !address || parsedAmount === BigInt(0)) return;

        setError(null);
        setIsProcessing(true);
        try {
          let currentAllowance = allowance ?? BigInt(0);

          // 1. Step One: Approve if needed
          if (currentAllowance < parsedAmount) {
            setStepStatus("approving");

            const { transactionHash } = await mutateAsync({
              address: usdgTokenAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [credditLiquidityPoolAddress, parsedAmount],
            });

            await waitForTransactionReceipt(config, { hash: transactionHash });

            // Use the freshly-fetched value directly rather than trusting a
            // stale closure on the next render — avoids a race where the
            // deposit fires before the new allowance has actually propagated.
            const { data: refreshed } = await refetch();
            currentAllowance = (refreshed?.[4]?.result as bigint) ?? BigInt(0);

            if (currentAllowance < parsedAmount) {
              throw new Error(
                "Allowance still insufficient after approval confirmed on-chain.",
              );
            }
          }

          // 2. Step Two: Execute Deposit
          setStepStatus("depositing");

          const { transactionHash } = await mutateAsync({
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "deposit",
            args: [parsedAmount, address],
          });

          const receipt = await waitForTransactionReceipt(config, {
            hash: transactionHash,
          });

          await queryClient.invalidateQueries({
            type: "active",
          });

          return receipt;
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
          throw err;
        } finally {
          setIsProcessing(false);
          setStepStatus("idle");
        }
      },
      [
        address,
        allowance,
        usdgTokenAddress,
        config,
        credditLiquidityPoolAddress,
        mutateAsync,
        refetch,
      ],
    );

    return {
      deposit,
      isProcessing,
      stepStatus,
      error,
    };
  }

  function usePoolData() {
    const { address: userAddress } = useConnection();

    const contracts = credditLiquidityPoolAddress
      ? [
          // 0: Current Active Debt
          {
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "currentDebt" as const,
          },
          // 1: Liquid Cash in Pool
          {
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "availableLiquidity" as const,
          },
          // 2: Total Assets Managed (Cash + Debt)
          {
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "totalAssets" as const,
          },
          // 3: Total Issued LP Shares (cUSDG)
          {
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "totalSupply" as const,
          },
          // 4: Quote Borrow Rate (rateBps, fee)
          {
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "quoteBorrow" as const,
          },
          // 5: User Share Balance
          {
            address: credditLiquidityPoolAddress,
            abi: credditLiquidityPoolAbi,
            functionName: "balanceOf" as const,
            args: userAddress ? [userAddress] : undefined,
          },
        ]
      : [];

    const { data, isLoading, refetch } = useReadContracts({
      contracts,
      query: {
        enabled: Boolean(credditLiquidityPoolAddress),
        staleTime: 1000 * 15, // Refresh every 15s
      },
    });

    // Extract raw BigInt values cleanly
    const currentDebt =
      data?.[0]?.status === "success" ? (data[0].result as bigint) : BigInt(0);
    const availableLiquidity =
      data?.[1]?.status === "success" ? (data[1].result as bigint) : BigInt(0);
    const totalAssets =
      data?.[2]?.status === "success" ? (data[2].result as bigint) : BigInt(0);
    const totalSupply =
      data?.[3]?.status === "success" ? (data[3].result as bigint) : BigInt(0);

    // quoteBorrow returns [rateBps, fee]
    const quoteBorrow =
      data?.[4]?.status === "success"
        ? (data[4].result as [bigint, bigint])
        : [BigInt(0), BigInt(0)];

    const borrowRateBps = quoteBorrow[0]; // e.g. 700n for 7.00%
    const originationFee = quoteBorrow[1];

    const userShares =
      userAddress && data?.[5]?.status === "success"
        ? (data[5].result as bigint)
        : BigInt(0);
    const formattedShare = formatUnits(userShares, TOKEN_DECIMALS.USDG);

    return {
      currentDebt,
      availableLiquidity,
      totalAssets,
      totalSupply,
      borrowRateBps,
      originationFee,
      userShares,
      formattedShare,
      isLoading,
      refetch,
    };
  }

  return {
    usePoolData,
    useDeposit,
  };
}
