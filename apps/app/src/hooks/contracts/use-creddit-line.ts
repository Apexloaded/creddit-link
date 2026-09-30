"use client";

import { useReadContract, useWriteContractSync } from "wagmi";
import { CREDDIT_PROTOCOL_ADDRESSES } from "@/config";
import { credditCreditLineAbi } from "@/contracts/abis/credditCreditLineAbi";
import { useCallback, useMemo, useState } from "react";
import { Address, erc20Abi } from "viem";
import { useErc20Details } from "./asset-registry";
import { cleanPrice, parseAmount } from "@/lib/utils";
import { config } from "@/config/wagmi.config";
import { waitForTransactionReceipt } from "wagmi/actions";
import { DepositSchemaType } from "@/schemas/deposit.schema";
import { BorrowSchemaType } from "@/schemas";

export const useCredditLine = () => {
  const creditLineAddress = CREDDIT_PROTOCOL_ADDRESSES.CREDIT_LINE;
  const usdgTokenAddress = CREDDIT_PROTOCOL_ADDRESSES.USDG;

  /**
   * 1. Hook to directly open a new position without depositing collateral
   */
  const useOpenPosition = () => {
    const { mutateAsync, isPending, error, data } = useWriteContractSync();

    const openPosition = async () => {
      return await mutateAsync({
        address: creditLineAddress,
        abi: credditCreditLineAbi,
        functionName: "openPosition",
      });
    };

    return {
      openPosition,
      isPending,
      error,
      txHash: data,
    };
  };

  /**
   * 2. Dynamic Deposit Hook:
   * Handles ERC20 approval check/tx -> Calls either depositCollateral or openPositionAndDeposit
   */
  const useDeposit = (asset?: Address) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepStatus, setStepStatus] = useState<
      "idle" | "approving" | "depositing"
    >("idle");
    const [error, setError] = useState<Error | null>(null);

    const { mutateAsync } = useWriteContractSync();

    let { decimals, allowance, refetch, isLoading } = useErc20Details(
      asset,
      creditLineAddress,
    );

    const deposit = useCallback(
      async ({
        amount,
        positionId,
      }: Omit<DepositSchemaType, "useAsCollateral">) => {
        const cleanedAmount = cleanPrice(amount, true);
        const parsedAmount = parseAmount(cleanedAmount, decimals);
        const parsedPositionId = positionId ? BigInt(positionId) : null;

        if (!asset || parsedAmount === BigInt(0) || isLoading) {
          return;
        }

        setError(null);
        setIsProcessing(true);
        try {
          // 1. Step One: Approve if needed
          if (allowance < parsedAmount) {
            setStepStatus("approving");

            // Initiate approve transaction
            const { transactionHash } = await mutateAsync({
              address: asset,
              abi: erc20Abi,
              functionName: "approve",
              args: [creditLineAddress, parsedAmount],
            });

            // Wait for the transaction to be mined
            await waitForTransactionReceipt(config, { hash: transactionHash });

            // Refetch to get the updated allowance
            const { data } = await refetch();
            allowance = (data?.[0]?.result as bigint | undefined) ?? BigInt(0);

            // Double check if allowance is sufficient
            if (allowance < parsedAmount) {
              throw new Error(
                "Allowance still insufficient after approval confirmed on-chain.",
              );
            }
          }

          // 2. Step Two: Execute Deposit
          setStepStatus("depositing");
          let transactionHash: `0x${string}`;

          if (parsedPositionId) {
            // Call depositCollateral for an existing position
            const result = await mutateAsync({
              address: creditLineAddress,
              abi: credditCreditLineAbi,
              functionName: "depositCollateral",
              args: [parsedPositionId, asset, parsedAmount],
            });
            transactionHash = result.transactionHash;
          } else {
            // Call openPositionAndDeposit for a new position
            const result = await mutateAsync({
              address: creditLineAddress,
              abi: credditCreditLineAbi,
              functionName: "openPositionAndDeposit",
              args: [asset, parsedAmount],
            });
            transactionHash = result.transactionHash;
          }

          const receipt = await waitForTransactionReceipt(config, {
            hash: transactionHash,
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
        asset,
        mutateAsync,
        cleanPrice,
        parseAmount,
        decimals,
        allowance,
        refetch,
        isLoading,
      ],
    );

    return {
      deposit,
      isProcessing,
      stepStatus,
      error,
    };
  };

  /**
   * 3. Borrow USDG hook (No approval needed since the protocol is the minter)
   */
  const useBorrow = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepStatus, setStepStatus] = useState<"idle" | "borrowing">("idle");
    const [error, setError] = useState<Error | null>(null);

    const { mutateAsync } = useWriteContractSync();

    const { decimals, isLoading } = useErc20Details(
      usdgTokenAddress,
      creditLineAddress,
    );

    const borrow = useCallback(
      async ({ amount, positionId }: BorrowSchemaType) => {
        const cleanedAmount = cleanPrice(amount, true);
        const parsedAmount = parseAmount(cleanedAmount, decimals);
        const parsedPositionId = BigInt(positionId);

        if (parsedAmount === BigInt(0)) return;

        setError(null);
        setIsProcessing(true);
        try {
          setStepStatus("borrowing");

          const { transactionHash } = await mutateAsync({
            address: creditLineAddress,
            abi: credditCreditLineAbi,
            functionName: "borrow",
            args: [parsedPositionId, parsedAmount],
          });

          const receipt = await waitForTransactionReceipt(config, {
            hash: transactionHash,
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
      [decimals, mutateAsync, isLoading],
    );

    return {
      borrow,
      isProcessing,
      stepStatus,
      error,
    };
  };

  const useGetPositionDebt = (positionId: string) => {
    return useReadContract({
      address: creditLineAddress,
      abi: credditCreditLineAbi,
      functionName: "debtIndexWad",
      // args: [BigInt(positionId)],
      query: {
        enabled: Boolean(positionId),
      },
    });
  };

  return {
    useOpenPosition,
    useDeposit,
    useBorrow,
    useGetPositionDebt,
  };
};
