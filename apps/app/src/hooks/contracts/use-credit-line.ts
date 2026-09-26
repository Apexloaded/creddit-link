"use client";

import { useCallback, useState } from "react";
import {
  CREDDIT_PROTOCOL_ADDRESSES,
  ORACLE_PRICE_DECIMALS,
} from "@/config/contract.config";
import { creditLineAbi } from "@/contracts/abis/creditLineAbi";
import { Address, erc20Abi, formatUnits } from "viem";
import {
  useConnection,
  useWriteContract,
  useConfig,
  useReadContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { credditRiskEngineAbi } from "@/contracts/abis/credditRiskEngineAbi";
import { RawCreditLimitSafe } from "@/contracts/interfaces/risk-engine";
import { useErc20Details } from "./asset-registry";
import { cleanPrice, parseAmount } from "@/lib/utils";

const creditLineAddress = CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE as Address;
const usdgTokenAddress = CREDDIT_PROTOCOL_ADDRESSES.USDG_TOKEN as Address;

export function useDepositCollateral(
  tokenAddress?: Address,
  rawAmountStr?: string,
) {
  const { address } = useConnection();
  const config = useConfig();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepStatus, setStepStatus] = useState<
    "idle" | "approving" | "depositing"
  >("idle");
  const [error, setError] = useState<Error | null>(null);

  const { decimals, allowance, refetch } = useErc20Details(
    tokenAddress,
    creditLineAddress,
  );

  const cleanAmount = cleanPrice(rawAmountStr, true);
  const parsedAmount = parseAmount(cleanAmount, decimals);

  const { writeContractAsync } = useWriteContract();

  const handleDepositFlow = useCallback(async () => {
    if (!tokenAddress || !address || parsedAmount === BigInt(0)) return;

    setError(null);
    setIsProcessing(true);
    try {
      let currentAllowance = allowance ?? BigInt(0);

      // 1. Step One: Approve if needed
      if (currentAllowance < parsedAmount) {
        setStepStatus("approving");

        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [creditLineAddress, parsedAmount],
        });

        await waitForTransactionReceipt(config, { hash: approveHash });

        // Use the freshly-fetched value directly rather than trusting a
        // stale closure on the next render — avoids a race where the
        // deposit fires before the new allowance has actually propagated.
        const { data: refreshed } = await refetch();
        currentAllowance =
          (refreshed?.[0]?.result as bigint | undefined) ?? BigInt(0);

        if (currentAllowance < parsedAmount) {
          throw new Error(
            "Allowance still insufficient after approval confirmed on-chain.",
          );
        }
      }

      // 2. Step Two: Execute Deposit
      setStepStatus("depositing");

      const depositHash = await writeContractAsync({
        address: creditLineAddress,
        abi: creditLineAbi,
        functionName: "depositCollateral",
        args: [tokenAddress, parsedAmount],
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
  }, [
    tokenAddress,
    address,
    parsedAmount,
    allowance,
    creditLineAddress,
    config,
    writeContractAsync,
    refetch,
  ]);

  return {
    handleDepositFlow,
    isProcessing,
    stepStatus, // Useful for dynamic button label ("Approving..." vs "Depositing...")
    error,
  };
}

export function useCreditLimit() {
  const { address: userAddress } = useConnection();
  const query = useReadContract({
    address: CREDDIT_PROTOCOL_ADDRESSES.RISK_ENGINE,
    abi: credditRiskEngineAbi,
    functionName: "creditLimitSafe",
    args: [CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE, userAddress!],
    query: {
      staleTime: 1000 * 1 * 60, // 1 minute
      select: (data): RawCreditLimitSafe => {
        const [limit, isStale, isValid] = data;
        return {
          limit: formatUnits(limit, ORACLE_PRICE_DECIMALS),
          isStale,
          isValid,
        };
      },
      enabled: !!userAddress,
    },
  });

  return {
    creditLimit: query.data,
    isLoading: query.isLoading,
  };
}

export function useBorrow() {
  const { address } = useConnection();
  const config = useConfig();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepStatus, setStepStatus] = useState<"idle" | "borrowing">("idle");
  const [error, setError] = useState<Error | null>(null);
  const { decimals } = useErc20Details(usdgTokenAddress);
  const { writeContractAsync, error: borrowError } = useWriteContract();

  const handleBorrow = useCallback(
    async (amount: string) => {
      const cleanAmount = cleanPrice(amount, true);
      const parsedAmount = parseAmount(cleanAmount, decimals);
      setIsProcessing(true);
      try {
        const depositHash = await writeContractAsync({
          address: creditLineAddress,
          abi: creditLineAbi,
          functionName: "borrow",
          args: [parsedAmount],
        });

        await waitForTransactionReceipt(config, { hash: depositHash });

        return depositHash;
      } catch (err) {
        console.log(err);
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setIsProcessing(false);
        setStepStatus("idle");
      }
    },
    [address, creditLineAddress, config, writeContractAsync],
  );

  return {
    handleBorrow,
    isProcessing,
    stepStatus,
    error,
  };
}
