"use client";

import { useCallback, useState } from "react";
import { useConfig, useConnection, useWriteContract } from "wagmi";
import { useErc20Details } from "./asset-registry";
import { CREDDIT_PROTOCOL_ADDRESSES } from "@/config/contract.config";
import { Address } from "viem/accounts";
import { cleanPrice, parseAmount } from "@/lib/utils";
import { credditLiquidityPoolAbi } from "@/contracts/abis/credditLiquidityPoolAbi";
import { erc20Abi } from "@/contracts/abis/erc20Abi";
import { waitForTransactionReceipt } from "wagmi/actions";

const credditLiquidityPoolAddress =
  CREDDIT_PROTOCOL_ADDRESSES.LIQUIDITY_POOL as Address;
const usdgTokenAddress = CREDDIT_PROTOCOL_ADDRESSES.USDG_TOKEN as Address;

export function useDepositLiquidity() {
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

  const { writeContractAsync } = useWriteContract();

  const handleDepositFlow = useCallback(
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

          const approveHash = await writeContractAsync({
            address: usdgTokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [credditLiquidityPoolAddress, parsedAmount],
          });

          await waitForTransactionReceipt(config, { hash: approveHash });

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

        const depositHash = await writeContractAsync({
          address: credditLiquidityPoolAddress,
          abi: credditLiquidityPoolAbi,
          functionName: "deposit",
          args: [parsedAmount, address],
        });

        await waitForTransactionReceipt(config, { hash: depositHash });

        return depositHash;
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
      writeContractAsync,
      refetch
    ],
  );

  return {
    handleDepositFlow,
    isProcessing,
    stepStatus,
    error,
  };
}
