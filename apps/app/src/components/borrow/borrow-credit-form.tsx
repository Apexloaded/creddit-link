"use client";

import { useMemo, useState, useEffect } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "../ui/button";
import { borrowSchemaResolver, BorrowSchemaType } from "@/schemas";
import { useForm } from "react-hook-form";
import { formatCurrency } from "@/lib/utils";
import { CurrencyInputField } from "../ui/currency-input";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useCredditLine } from "@/hooks";

type Props = {
  onCloseModal?: () => void;
  positions: IPosition[];
};

export default function BorrowCreditForm({
  positions = [],
  onCloseModal,
}: Props) {
  // Store selected position ID in state (single position allowed)
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(
    positions.length > 0 ? positions[0].id : null,
  );
  const { useBorrow } = useCredditLine();
  const { borrow, isProcessing, stepStatus } = useBorrow();

  // Initialize form
  const {
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isValid },
  } = useForm<BorrowSchemaType>({
    resolver: borrowSchemaResolver,
    defaultValues: {
      amount: "",
      positionId: positions.length > 0 ? positions[0].id.toString() : undefined,
    },
  });

  // Keep selectedPositionId and form field in sync
  const handleSelectPosition = (positionId: number) => {
    setSelectedPositionId(positionId);
    setValue("positionId", positionId.toString(), { shouldValidate: true });
    // Reset amount input when changing position
    setValue("amount", "0", { shouldValidate: true });
  };

  // Find the active selected position object
  const selectedPosition = useMemo(
    () => positions.find((p) => p.id === selectedPositionId) || null,
    [positions, selectedPositionId],
  );

  // Derive active position metrics
  const collateralValue = selectedPosition
    ? Number(selectedPosition.collateralUsd.formatted)
    : 0;

  const currentDebt = selectedPosition
    ? Number(selectedPosition.debt.formatted)
    : 0;

  const creditLimit = selectedPosition
    ? Number(selectedPosition.creditLimitUsd.formatted)
    : 0;

  // Maximum new USDG amount that can be borrowed for this position
  const maxBorrowCapacity = Math.max(0, creditLimit - currentDebt);

  // Watch the amount field from react-hook-form
  const amountValue = watch("amount");
  const borrowAmount = Number(amountValue) || 0;

  // Calculate new simulated totals
  const totalSimulatedDebt = currentDebt + borrowAmount;

  // Credit utilization against credit limit
  const utilization =
    creditLimit > 0 ? (totalSimulatedDebt / creditLimit) * 100 : 0;

  const health =
    utilization === 0
      ? "Healthy"
      : utilization < 50
        ? "Healthy"
        : utilization < 80
          ? "Moderate"
          : "High Risk";

  const healthDot =
    health === "Healthy"
      ? "bg-emerald-500"
      : health === "Moderate"
        ? "bg-amber-500"
        : "bg-red-500";

  const getButtonText = () => {
    if (stepStatus === "borrowing") return "1/1 Borrowing...";
    // if (isListLoading) return "Loading...";
    return "Borrow";
  };

  const onSubmit = async (data: BorrowSchemaType) => {
    try {
      const receipt = await borrow(data);
      onCloseModal?.();
    } catch (error) {
      console.error("Borrow workflow failed or rejected:", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 flex flex-col gap-3 flex-1"
    >
      <div className="flex flex-col flex-1 overflow-hidden border border-line bg-background shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-foreground">Borrow Credit</p>
            </div>

            <p className="mt-1 text-xs text-foreground/40">
              Borrow USDG against an existing collateral position.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <span className={`size-1.5 rounded-full ${healthDot}`} />
            <span className="text-xs font-medium text-foreground/60">
              {health}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-scroll">
          {/* Main */}
          <div className="px-6 py-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm text-foreground/50">USDG credit amount</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-5xl md:text-6xl">$</p>

                  <CurrencyInputField
                    control={control}
                    name="amount"
                    placeholder={formatCurrency(maxBorrowCapacity, false)}
                    className="h-16 -ml-1 rounded-none focus-visible:ring-0 border-0 shadow-none bg-transparent px-0 font-heading text-5xl font-normal tracking-tight md:text-6xl"
                  />
                </div>

                <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/50">
                  The amount of USDG to borrow against your selected position
                  (Max: {formatCurrency(maxBorrowCapacity)})
                </p>
              </div>
            </div>

            {/* Position Selection */}
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
                    const posCollateral = Number(pos.collateralUsd.formatted);
                    const posDebt = Number(pos.debt.formatted);
                    const posLimit = Number(pos.creditLimitUsd.formatted);
                    const posAvailable = Math.max(0, posLimit - posDebt);

                    // Join underlying collateral asset names (e.g., "ETH, WBTC")
                    const collateralSymbols = pos.collaterals
                      .map((c) => c.symbol)
                      .join(", ");

                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => handleSelectPosition(pos.id)}
                        className={[
                          "group flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-200",
                          selected
                            ? "border-foreground/20 bg-secondary"
                            : "border-line bg-background hover:border-foreground/20 hover:bg-secondary/50",
                        ].join(" ")}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs font-medium">
                              Position #{pos.id}
                            </p>
                            {collateralSymbols && (
                              <span className="text-[10px] text-foreground/40 uppercase">
                                ({collateralSymbols})
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs text-foreground/50">
                            <span>
                              Collateral: {formatCurrency(posCollateral)}
                            </span>
                            <span>Limit: {formatCurrency(posAvailable)}</span>
                          </div>
                        </div>

                        <span
                          className={[
                            "flex size-5 items-center justify-center rounded-full border transition-all duration-200",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-line text-transparent",
                          ].join(" ")}
                        >
                          <CheckIcon className="size-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Borrow simulation slider */}
            <div className="mt-10">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-foreground/50">Simulate borrowing</span>

                <span className="font-medium">
                  {formatCurrency(borrowAmount)} USDG
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={maxBorrowCapacity}
                step={10}
                value={Math.min(borrowAmount, maxBorrowCapacity)}
                disabled={maxBorrowCapacity === 0}
                onChange={(e) =>
                  setValue("amount", e.target.value, { shouldValidate: true })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
              />

              <div className="mt-3 flex justify-between text-xs text-foreground/40">
                <span>{formatCurrency(borrowAmount)} requested</span>
                <span>{formatCurrency(maxBorrowCapacity)} max capacity</span>
              </div>
            </div>

            {/* Utilisation */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-foreground/50">Credit utilization</span>

                <span className="font-medium">{utilization.toFixed(1)}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    utilization >= 80 ? "bg-destructive" : "bg-foreground"
                  }`}
                  style={{
                    width: `${Math.min(utilization, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="flex flex-col w-full items-center pb-4">
          <div className="bg-secondary/40 w-full border-y border-line">
            <div className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Collateral</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(collateralValue)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Credit Limit</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(creditLimit)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Total Debt</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(totalSimulatedDebt)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Remaining Capacity</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(
                    Math.max(maxBorrowCapacity - borrowAmount, 0),
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-4 px-6 pt-4">
            <Button
              onClick={onCloseModal}
              type="button"
              size={"xl"}
              variant={"outline"}
              className={"flex-1"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !isValid ||
                isProcessing ||
                borrowAmount <= 0 ||
                borrowAmount > maxBorrowCapacity
              }
              size={"xl"}
              className={"flex-1"}
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
