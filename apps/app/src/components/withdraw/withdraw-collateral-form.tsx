"use client";

import { useState } from "react";
import { AlertTriangleIcon, CheckIcon } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { Address } from "viem";
import { Button } from "../ui/button";
import { CurrencyInputField } from "../ui/currency-input";
import {
  withdrawCollateralSchemaResolver,
  WithdrawCollateralSchemaType,
} from "@/schemas/withdraw.schema";
import { cn, formatCurrency } from "@/lib/utils";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useCredditLine } from "@/hooks";

type Props = {
  onCloseModal?: () => void;
  positions: IPosition[];
};

const formatToken = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 4 });

export default function WithdrawCollateralForm({
  positions = [],
  onCloseModal,
}: Props) {
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(
    positions.length > 0 ? positions[0].id : null,
  );
  const { useWithdraw } = useCredditLine();
  const { withdraw, isProcessing, stepStatus } = useWithdraw();

  const {
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isValid },
  } = useForm<WithdrawCollateralSchemaType>({
    resolver: withdrawCollateralSchemaResolver,
    defaultValues: {
      positionId: positions.length > 0 ? positions[0].id.toString() : "",
      withdrawals: [],
    },
  });

  const { append, remove, replace } = useFieldArray({
    control,
    name: "withdrawals",
  });

  const handleSelectPosition = (positionId: number) => {
    setSelectedPositionId(positionId);
    setValue("positionId", positionId.toString(), { shouldValidate: true });
    // Assets belong to a position, so clear any selection when it changes
    replace([]);
  };

  // Active position and its metrics
  const selectedPosition =
    positions.find((p) => p.id === selectedPositionId) ?? null;
  const collaterals = selectedPosition?.collaterals ?? [];

  const collateralValue = selectedPosition
    ? Number(selectedPosition.collateralUsd.formatted)
    : 0;
  const currentDebt = selectedPosition
    ? Number(selectedPosition.debt.formatted)
    : 0;
  const creditLimit = selectedPosition
    ? Number(selectedPosition.creditLimitUsd.formatted)
    : 0;

  // Per-asset withdrawal lines derived from the form
  const withdrawals = watch("withdrawals") ?? [];

  const lines = withdrawals.map((w) => {
    const col = collaterals.find(
      (c) => c.asset.toLowerCase() === w.asset.toLowerCase(),
    );
    const balance = Number(col?.value.formatted) || 0;
    const amount = Number(w.amount) || 0;
    // Position USD value divided by token balance (see note below the code)
    const unitPriceUsd = balance > 0 ? collateralValue / balance : 0;

    return {
      balance,
      amount,
      usd: amount * unitPriceUsd,
      exceedsBalance: amount > balance,
    };
  });

  const totalWithdrawUsd = lines.reduce((sum, l) => sum + l.usd, 0);
  const hasExceededBalance = lines.some((l) => l.exceedsBalance);
  const remainingCollateral = Math.max(0, collateralValue - totalWithdrawUsd);

  // Credit limit scales with the collateral that remains
  const limitRatio = collateralValue > 0 ? creditLimit / collateralValue : 0;
  const newCreditLimit = remainingCollateral * limitRatio;

  const utilization =
    newCreditLimit > 0
      ? (currentDebt / newCreditLimit) * 100
      : currentDebt > 0
        ? 100
        : 0;

  const isUndercollateralized =
    totalWithdrawUsd > 0 && currentDebt > newCreditLimit;

  const health =
    utilization < 50 ? "Healthy" : utilization < 80 ? "Moderate" : "High Risk";

  const healthDot =
    health === "Healthy"
      ? "bg-emerald-500"
      : health === "Moderate"
        ? "bg-amber-500"
        : "bg-red-500";

  const warning = hasExceededBalance
    ? "One or more amounts exceed the available balance for that asset."
    : isUndercollateralized
      ? "This withdrawal would leave your position under-collateralized for its current debt."
      : totalWithdrawUsd > 0 && utilization >= 80
        ? "This withdrawal puts your position at high liquidation risk."
        : null;

  const toggleAsset = (asset: Address) => {
    const index = withdrawals.findIndex(
      (w) => w.asset.toLowerCase() === asset.toLowerCase(),
    );
    if (index >= 0) remove(index);
    else append({ asset, amount: "" });
  };

  const getButtonText = () => {
    if (stepStatus === "withdrawing") return "1/1 Withdrawing...";
    if (withdrawals.length === 0) return "Withdraw";
    return `Withdraw ${withdrawals.length} Asset${withdrawals.length > 1 ? "s" : ""}`;
  };

const onSubmit = async (data: WithdrawCollateralSchemaType) => {
  try {
    await withdraw({
      positionId: data.positionId,
      withdrawals: data.withdrawals.map((w) => {
        const col = collaterals.find(
          (c) => c.asset.toLowerCase() === w.asset.toLowerCase(),
        );
        return {
          asset: w.asset as Address,
          amount: w.amount,
          decimals: 18, // adjust to your ICollateral field
        };
      }),
    });
    onCloseModal?.();
  } catch (error) {
    console.error("Withdraw workflow failed or rejected:", error);
  }
};

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
      <div className="flex flex-col flex-1 overflow-hidden border border-line bg-background shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-xl font-bold text-foreground">
              Withdraw Collateral
            </p>
            <p className="mt-1 text-xs text-foreground/40">
              Remove collateral assets from an existing position.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <span className={`size-1.5 rounded-full ${healthDot}`} />
            <span className="text-xs font-medium text-foreground/60">
              {health}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8">
            {/* Total withdrawal value */}
            <div>
              <p className="text-sm text-foreground/50">
                Total withdrawal value
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-5xl md:text-6xl">$</p>
                <p className="font-heading text-5xl font-normal tracking-tight md:text-6xl">
                  {formatCurrency(totalWithdrawUsd, false)}
                </p>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/50">
                Estimated USD value of the assets you are removing from Position
                #{selectedPositionId ?? "—"}.
              </p>
            </div>

            {/* Position selection */}
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground/40">
                  Select Position
                </p>
                <p className="text-xs text-foreground/40">
                  Position #{selectedPositionId ?? "None"} selected
                </p>
              </div>

              {positions.length === 0 ? (
                <div className="rounded-lg border border-line p-4 text-center text-xs text-foreground/50">
                  No positions available. Please create a position or deposit
                  collateral first.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {positions.map((pos) => {
                    const selected = pos.id === selectedPositionId;
                    const symbols = pos.collaterals
                      .map((c) => c.symbol)
                      .join(", ");

                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => handleSelectPosition(pos.id)}
                        className={cn(
                          "group flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-200",
                          selected
                            ? "border-foreground/20 bg-secondary"
                            : "border-line bg-background hover:border-foreground/20 hover:bg-secondary/50",
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs font-medium">
                              Position #{pos.id}
                            </p>
                            {symbols && (
                              <span className="text-[10px] uppercase text-foreground/40">
                                ({symbols})
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-foreground/50">
                            <span>
                              Collateral:{" "}
                              {formatCurrency(
                                Number(pos.collateralUsd.formatted),
                              )}
                            </span>
                            <span>
                              Debt: {formatCurrency(Number(pos.debt.formatted))}
                            </span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border transition-all duration-200",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-line text-transparent",
                          )}
                        >
                          <CheckIcon className="size-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Asset selection + amounts */}
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground/40">
                  Select Assets
                </p>
                <p className="text-xs text-foreground/40">
                  {withdrawals.length} of {collaterals.length} selected
                </p>
              </div>

              {collaterals.length === 0 ? (
                <div className="rounded-lg border border-line p-4 text-center text-xs text-foreground/50">
                  This position has no collateral assets to withdraw.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {collaterals.map((c) => {
                    const index = withdrawals.findIndex(
                      (w) => w.asset.toLowerCase() === c.asset.toLowerCase(),
                    );
                    const selected = index >= 0;
                    const line = selected ? lines[index] : null;
                    const balance = Number(c.value.formatted) || 0;

                    return (
                      <div
                        key={c.asset}
                        className={cn(
                          "rounded-lg border transition-all duration-200",
                          selected
                            ? "border-foreground/20 bg-secondary"
                            : "border-line bg-background hover:border-foreground/20 hover:bg-secondary/50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAsset(c.asset as Address)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div>
                            <p className="font-mono text-xs font-medium">
                              {c.symbol}
                            </p>
                            <p className="mt-1 text-xs text-foreground/50">
                              Available: {formatToken(balance)} {c.symbol}
                            </p>
                          </div>

                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full border transition-all duration-200",
                              selected
                                ? "border-foreground bg-foreground text-background"
                                : "border-line text-transparent",
                            )}
                          >
                            <CheckIcon className="size-3" />
                          </span>
                        </button>

                        {selected && (
                          <div className="border-t border-line px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <CurrencyInputField
                                  control={control}
                                  name={`withdrawals.${index}.amount`}
                                  placeholder="0.00"
                                  className="h-12 rounded-none border-0 bg-transparent px-0 font-heading text-3xl font-normal tracking-tight shadow-none focus-visible:ring-0"
                                />
                              </div>

                              <span className="text-xs font-medium uppercase text-foreground/40">
                                {c.symbol}
                              </span>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setValue(
                                    `withdrawals.${index}.amount`,
                                    balance.toString(),
                                    { shouldValidate: true },
                                  )
                                }
                              >
                                Max
                              </Button>
                            </div>

                            <p
                              className={cn(
                                "mt-1 text-xs",
                                line?.exceedsBalance
                                  ? "text-destructive"
                                  : "text-foreground/40",
                              )}
                            >
                              {line?.exceedsBalance
                                ? "Exceeds available balance"
                                : `≈ ${formatCurrency(line?.usd ?? 0)}`}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Utilisation after withdrawal */}
            <div className="mt-10">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-foreground/50">
                  Credit utilization after withdrawal
                </span>
                <span className="font-medium">
                  {Math.min(utilization, 999).toFixed(1)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    utilization >= 80 ? "bg-destructive" : "bg-foreground",
                  )}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>

              {warning && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                  <p>{warning}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer metrics */}
        <div className="flex w-full flex-col items-center pb-4">
          <div className="w-full border-y border-line bg-secondary/40">
            <div className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Collateral</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(collateralValue)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Withdrawing</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(totalWithdrawUsd)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Remaining</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(remainingCollateral)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Total Debt</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(currentDebt)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-4 px-6 pt-4">
            <Button
              onClick={onCloseModal}
              type="button"
              size="xl"
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !isValid ||
                isProcessing ||
                withdrawals.length === 0 ||
                totalWithdrawUsd <= 0 ||
                hasExceededBalance ||
                isUndercollateralized
              }
              size="xl"
              className="flex-1"
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
