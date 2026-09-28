"use client";

import { useCallback, useState } from "react";
import {
  CREDDIT_PROTOCOL_ADDRESSES,
  ORACLE_PRICE_DECIMALS,
} from "@/config/contract.config";
import { credditCreditLineAbi } from "@/contracts/abis/credditCreditLineAbi";
import { Address, erc20Abi, formatUnits } from "viem";
import {
  useConnection,
  useWriteContract,
  useConfig,
  useReadContracts,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { credditRiskEngineAbi } from "@/contracts/abis/credditRiskEngineAbi";
import { RawCreditLimitSafe } from "@/contracts/interfaces/risk-engine";
import { useErc20Details } from "./asset-registry";
import { cleanPrice, parseAmount } from "@/lib/utils";

const creditLineAddress = CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE as Address;
const usdgTokenAddress = CREDDIT_PROTOCOL_ADDRESSES.USDG as Address;

export function useDepositCollateral(
  tokenAddress?: Address,
  rawAmountStr?: string,
) {
  const { address, chainId } = useConnection();
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
        abi: credditCreditLineAbi,
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

  const contracts = [
    {
      address: CREDDIT_PROTOCOL_ADDRESSES.RISK_ENGINE,
      abi: credditRiskEngineAbi,
      functionName: "creditLimitSafe",
      args: userAddress
        ? [CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE, userAddress]
        : undefined,
    },
    {
      address: CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE,
      abi: credditCreditLineAbi,
      functionName: "userDebt",
      args: userAddress ? [userAddress] : undefined,
    },
    {
      address: CREDDIT_PROTOCOL_ADDRESSES.RISK_ENGINE,
      abi: credditRiskEngineAbi,
      functionName: "liquidationValue",
      args: userAddress
        ? [CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE, userAddress, true]
        : undefined,
    },
  ];

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(userAddress),
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

  const [creditLimitResult, userDebtResult, liquidationValueResult] =
    data || [];

  // Parse raw values
  const rawCreditLimitData =
    creditLimitResult?.status === "success"
      ? (creditLimitResult?.result as unknown as [bigint, boolean, boolean])
      : null;

  const rawUserDebt =
    userDebtResult?.status === "success"
      ? (userDebtResult.result as unknown as bigint)
      : null;

  const rawUserLiquidationValue =
    userDebtResult?.status === "success"
      ? (liquidationValueResult.result as unknown as [bigint, boolean, boolean])
      : null;

  console.log("RAW LIQUID VALUE :: :: ", rawUserLiquidationValue);

  // Transform and format output values
  const parsedData: RawCreditLimitSafe = (() => {
    if (!rawCreditLimitData || !rawUserLiquidationValue)
      return {
        limit: "0",
        userDebt: "0",
        availableCredit: "0",
        isStale: true,
        isValid: false,
      };

    const [limitRaw, isStale, isValid] = rawCreditLimitData;
    const [liquidationValueRaw] = rawUserLiquidationValue;
    const userDebtRaw = rawUserDebt ?? BigInt(0);

    // Available credit in raw BigInt terms (non-negative)
    const availableCreditRaw =
      limitRaw > userDebtRaw ? limitRaw - userDebtRaw : BigInt(0);

    return {
      limit: formatUnits(limitRaw, ORACLE_PRICE_DECIMALS),
      userDebt: formatUnits(userDebtRaw, ORACLE_PRICE_DECIMALS),
      availableCredit: formatUnits(availableCreditRaw, ORACLE_PRICE_DECIMALS),
      liquidationValue: formatUnits(liquidationValueRaw, ORACLE_PRICE_DECIMALS),
      isStale,
      isValid,
    };
  })();

  return {
    creditLimit: parsedData,
    isLoading,
    isError,
    refetch,
  };
}

export function useBorrow() {
  const { address } = useConnection();
  const config = useConfig();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepStatus, setStepStatus] = useState<"idle" | "borrowing">("idle");
  const [error, setError] = useState<Error | null>(null);

  const { decimals, isLoading: isDecimalsLoading } =
    useErc20Details(usdgTokenAddress);
  const { writeContractAsync } = useWriteContract();

  const handleBorrow = useCallback(
    async (amount: string) => {
      if (isDecimalsLoading) {
        const err = new Error("Token details are still loading");
        setError(err);
        throw err;
      }

      const cleanAmount = cleanPrice(amount, true);
      const parsedAmount = parseAmount(cleanAmount, decimals);

      setIsProcessing(true);
      setStepStatus("borrowing");
      try {
        const depositHash = await writeContractAsync({
          address: creditLineAddress,
          abi: credditCreditLineAbi,
          functionName: "borrow",
          args: [parsedAmount],
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
    [decimals, isDecimalsLoading, config, writeContractAsync],
  );

  return {
    handleBorrow,
    isProcessing,
    stepStatus,
    error,
  };
}
