"use client";

import { useConnection, useReadContract, useWriteContractSync } from "wagmi";
import { Contracts, Tokens } from "@/config";
import { credditCreditLineAbi } from "@/contracts/abis/credditCreditLineAbi";
import { useCallback, useState } from "react";
import { Address, erc20Abi, maxUint256 } from "viem";
import { useErc20Details } from "./use-erc20";
import {
  cleanPrice,
  parseAmount,
  toFormattedAmount,
  wadToTokenDecimalsUp,
} from "@/lib/utils";
import { config } from "@/config/wagmi.config";
import { getTransactionCount, waitForTransactionReceipt } from "wagmi/actions";
import { DepositSchemaType } from "@/schemas/deposit.schema";
import { BorrowSchemaType, RepaySchemaType } from "@/schemas";
import { useCredditAddresses } from "./use-creddit-addresses";
import { useQueryClient } from "@tanstack/react-query";

export const useCredditLine = () => {
  const { address } = useConnection();
  const { getContract, getToken } = useCredditAddresses();
  const creditLineAddress = getContract(Contracts.CREDIT_LINE);
  const usdgTokenAddress = getToken(Tokens.USDG);
  const queryClient = useQueryClient();

  /**
   * 1. Hook to directly open a new position without depositing collateral
   */
  const useOpenPosition = () => {
    const { mutateAsync, isPending, error, data } = useWriteContractSync();

    const openPosition = async () => {
      const { transactionHash } = await mutateAsync({
        address: creditLineAddress,
        abi: credditCreditLineAbi,
        functionName: "openPosition",
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: transactionHash,
      });

      await queryClient.invalidateQueries({
        type: "active",
      });

      return receipt;
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
      [decimals, mutateAsync, isLoading],
    );

    return {
      borrow,
      isProcessing,
      stepStatus,
      error,
    };
  };

  /**
   * 4. Dynamic Repay Hook:
   * Handles ERC20 approval check/tx -> Calls repay
   */
  const useRepay = (positionId: string | null) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepStatus, setStepStatus] = useState<
      "idle" | "approving" | "repaying"
    >("idle");
    const [error, setError] = useState<Error | null>(null);

    const { mutateAsync } = useWriteContractSync();

    let { decimals, allowance, refetch, isLoading } = useErc20Details(
      usdgTokenAddress,
      creditLineAddress,
    );

    const { refetch: refetchDebt } = useCurrentPositionDebt(positionId);

    const repay = useCallback(
      async ({ amount, positionId, isFullRepay }: RepaySchemaType) => {
        const cleanedAmount = cleanPrice(amount, true);
        const parsedAmount = parseAmount(cleanedAmount, decimals);
        const parsedPositionId = BigInt(positionId);

        const { data: liveDebt } = await refetchDebt();

        if (
          !usdgTokenAddress ||
          parsedAmount === BigInt(0) ||
          isLoading ||
          !liveDebt
        ) {
          return;
        }

        setError(null);
        setIsProcessing(true);

        try {
          const currentDebtWad = liveDebt ? liveDebt.raw : BigInt(0);
          const currentDebtToken = wadToTokenDecimalsUp(currentDebtWad);

          // 1. Determine if this is a full repayment
          const isMaxRepay =
            isFullRepay ||
            (currentDebtToken > BigInt(0) && parsedAmount >= currentDebtToken);

          // 2. Calculate required approval & repay amounts
          // Add 0.1% buffer (1001 / 1000) for full repayment to handle pending block drift
          const targetRepayAmount = isMaxRepay
            ? (currentDebtToken * BigInt(1001)) / BigInt(1000)
            : parsedAmount;

          // 3. Step One: Check & Approve if allowance is insufficient
          if (allowance < targetRepayAmount) {
            setStepStatus("approving");

            const nonce = await getTransactionCount(config, {
              address: address!,
              blockTag: "pending",
            });

            const { transactionHash } = await mutateAsync({
              address: usdgTokenAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [creditLineAddress, targetRepayAmount],
              nonce,
            });

            await waitForTransactionReceipt(config, { hash: transactionHash });

            // Refetch updated allowance
            const { data } = await refetch();
            allowance = (data?.[0]?.result as bigint | undefined) ?? BigInt(0);

            if (allowance < targetRepayAmount) {
              throw new Error(
                "Allowance still insufficient after approval confirmed on-chain.",
              );
            }
          }

          // 4. Step Two: Execute Repayment
          setStepStatus("repaying");

          const { transactionHash } = await mutateAsync({
            address: creditLineAddress,
            abi: credditCreditLineAbi,
            functionName: "repay",
            args: [parsedPositionId, targetRepayAmount],
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
        usdgTokenAddress,
        mutateAsync,
        cleanPrice,
        parseAmount,
        decimals,
        allowance,
        refetch,
        isLoading,
        refetchDebt,
      ],
    );

    return {
      repay,
      isProcessing,
      stepStatus,
      error,
    };
  };

  /**
   * 5. Fetch the current debt of a position (for repay forms / dashboards)
   */
  const useCurrentPositionDebt = (positionId: string | null) => {
    return useReadContract({
      address: creditLineAddress,
      abi: credditCreditLineAbi,
      functionName: "currentPositionDebt",
      args: [positionId ? BigInt(positionId) : BigInt(0)],
      query: {
        enabled: Boolean(positionId && BigInt(positionId) > BigInt(0)),
        select: (data) => toFormattedAmount(data),
      },
    });
  };

  /**
   * 6. Withdraw Collateral Hook:
   * Supports single asset withdrawal via withdrawCollateral or batch withdrawal via withdrawCollateralBatch
   */
  const useWithdraw = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepStatus, setStepStatus] = useState<"idle" | "withdrawing">(
      "idle",
    );
    const [error, setError] = useState<Error | null>(null);

    const { mutateAsync } = useWriteContractSync();

    const withdraw = useCallback(
      async ({
        positionId,
        withdrawals,
      }: {
        positionId: string;
        withdrawals: { asset: Address; amount: string; decimals: number }[];
      }) => {
        // Parse with each asset's own decimals and drop empty rows
        const items = withdrawals
          .map((w) => ({
            asset: w.asset,
            amount: parseAmount(cleanPrice(w.amount, true), w.decimals),
          }))
          .filter((w) => w.amount > BigInt(0));

        if (items.length === 0) {
          throw new Error("Enter an amount to withdraw.");
        }

        const uniqueAssets = new Set(items.map((i) => i.asset.toLowerCase()));
        if (uniqueAssets.size !== items.length) {
          throw new Error("Duplicate assets in withdrawal.");
        }

        setError(null);
        setIsProcessing(true);

        try {
          const parsedPositionId = BigInt(positionId);
          setStepStatus("withdrawing");

          const result =
            items.length === 1
              ? await mutateAsync({
                  address: creditLineAddress,
                  abi: credditCreditLineAbi,
                  functionName: "withdrawCollateral",
                  args: [parsedPositionId, items[0].asset, items[0].amount],
                })
              : await mutateAsync({
                  address: creditLineAddress,
                  abi: credditCreditLineAbi,
                  functionName: "withdrawCollateralBatch",
                  args: [
                    parsedPositionId,
                    items.map((i) => i.asset),
                    items.map((i) => i.amount),
                  ],
                });

          const receipt = await waitForTransactionReceipt(config, {
            hash: result.transactionHash,
          });

          if (receipt.status !== "success") {
            throw new Error("Withdrawal transaction reverted.");
          }

          await queryClient.invalidateQueries({ type: "active" });

          return receipt;
        } catch (err) {
          console.error("Error during withdrawal:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          throw err;
        } finally {
          setIsProcessing(false);
          setStepStatus("idle");
        }
      },
      [config, creditLineAddress, mutateAsync, queryClient],
    );

    return { withdraw, isProcessing, stepStatus, error };
  };

  /**
   * 7. Liquidate Hook:
   * Approves USDG if allowance is insufficient, then executes liquidate call
   */
  const useLiquidate = (collateralAsset?: Address) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepStatus, setStepStatus] = useState<
      "idle" | "approving" | "liquidating"
    >("idle");
    const [error, setError] = useState<Error | null>(null);

    const { mutateAsync } = useWriteContractSync();

    let { decimals, allowance, refetch, isLoading } = useErc20Details(
      usdgTokenAddress,
      creditLineAddress,
    );

    const liquidate = useCallback(
      async ({
        positionId,
        collateralAsset: overrideAsset,
        debtToCover,
      }: {
        positionId: string;
        collateralAsset?: Address;
        debtToCover: string;
      }) => {
        const targetAsset = overrideAsset || collateralAsset;
        const cleanedAmount = cleanPrice(debtToCover, true);
        const parsedDebtToCover = parseAmount(cleanedAmount, decimals);
        const parsedPositionId = BigInt(positionId);

        if (
          !usdgTokenAddress ||
          !targetAsset ||
          parsedDebtToCover === BigInt(0) ||
          isLoading
        ) {
          return;
        }

        setError(null);
        setIsProcessing(true);

        try {
          // 1. Step One: Check & Approve USDG if allowance is insufficient
          if (allowance < parsedDebtToCover) {
            setStepStatus("approving");

            const nonce = await getTransactionCount(config, {
              address: address!,
              blockTag: "pending",
            });

            const { transactionHash } = await mutateAsync({
              address: usdgTokenAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [creditLineAddress, parsedDebtToCover],
              nonce,
            });

            await waitForTransactionReceipt(config, { hash: transactionHash });

            const { data } = await refetch();
            allowance = (data?.[0]?.result as bigint | undefined) ?? BigInt(0);

            if (allowance < parsedDebtToCover) {
              throw new Error(
                "Allowance still insufficient after approval confirmed on-chain.",
              );
            }
          }

          // 2. Step Two: Execute Liquidation
          setStepStatus("liquidating");

          const { transactionHash } = await mutateAsync({
            address: creditLineAddress,
            abi: credditCreditLineAbi,
            functionName: "liquidate",
            args: [parsedPositionId, targetAsset, parsedDebtToCover],
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
        usdgTokenAddress,
        creditLineAddress,
        collateralAsset,
        decimals,
        allowance,
        isLoading,
        mutateAsync,
        refetch,
        queryClient,
      ],
    );

    return {
      liquidate,
      isProcessing,
      stepStatus,
      error,
    };
  };

  return {
    useOpenPosition,
    useDeposit,
    useBorrow,
    useRepay,
    useCurrentPositionDebt,
    useWithdraw,
    useLiquidate,
  };
};
