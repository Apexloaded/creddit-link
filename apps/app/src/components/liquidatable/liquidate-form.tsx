"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Address } from "viem";
import { ZapIcon, WalletIcon, AlertTriangleIcon, CheckIcon } from "lucide-react";
import { Button } from "../ui/button";
import { CurrencyInputField } from "../ui/currency-input";
import { cleanPrice, cn, formatCurrency } from "@/lib/utils";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useCreddit } from "@/context/creddit.context";
import { useCredditLine } from "@/hooks/contracts/use-creddit-line";
import { liquidateSchemaResolver, LiquidateSchemaType } from "@/schemas";

type Props = {
  position: IPosition;
  positions?: IPosition[];
  onCloseModal?: () => void;
};

export default function LiquidateForm({
  position: initialPosition,
  positions = [],
  onCloseModal,
}: Props) {
  const [selectedPositionId, setSelectedPositionId] = useState<number>(
    initialPosition.id,
  );
  const [activePct, setActivePct] = useState<number | null>(null);

  const availablePositions =
    positions.length > 0 ? positions : [initialPosition];
  const selectedPosition =
    availablePositions.find((p) => p.id === selectedPositionId) ?? initialPosition;

  const collaterals = selectedPosition.collaterals ?? [];
  const [selectedCollateralAsset, setSelectedCollateralAsset] = useState<string>(
    collaterals[0]?.asset ?? "",
  );

  useEffect(() => {
    if (collaterals.length > 0 && !collaterals.some((c) => c.asset === selectedCollateralAsset)) {
      setSelectedCollateralAsset(collaterals[0].asset);
    }
  }, [collaterals, selectedCollateralAsset]);

  const { usdgUnitBalance } = useCreddit();
  const userUsdgBalance = Number(cleanPrice(usdgUnitBalance) || 0);

  const targetDebt = Number(selectedPosition.debt?.formatted ?? "0");
  const maxCoverable = Math.min(userUsdgBalance, targetDebt);

  const { useLiquidate } = useCredditLine();
  const { liquidate, isProcessing, stepStatus, error } = useLiquidate(
    selectedPositionId.toString(),
    selectedCollateralAsset as Address,
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<LiquidateSchemaType>({
    resolver: liquidateSchemaResolver,
    defaultValues: {
      positionId: selectedPosition.id.toString(),
      collateralAsset: selectedCollateralAsset,
      debtToCover: "",
    },
    context: {
      maxCoverable,
    },
    mode: "onChange",
  });

  useEffect(() => {
    setValue("positionId", selectedPosition.id.toString(), { shouldValidate: true });
  }, [selectedPosition.id, setValue]);

  useEffect(() => {
    setValue("collateralAsset", selectedCollateralAsset, { shouldValidate: true });
  }, [selectedCollateralAsset, setValue]);

  const debtToCoverInput = watch("debtToCover");
  const debtToCoverAmount = Number(cleanPrice(debtToCoverInput)) || 0;

  const selectedCollateralItem = collaterals.find(
    (c) => c.asset.toLowerCase() === selectedCollateralAsset.toLowerCase(),
  );

  const handleMaxClick = () => {
    setActivePct(100);
    setValue("debtToCover", maxCoverable.toString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handlePercentageClick = (pct: number) => {
    setActivePct(pct);
    const calculatedAmount = ((maxCoverable * pct) / 100).toString();
    setValue("debtToCover", calculatedAmount, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleSelectPosition = (posId: number) => {
    setSelectedPositionId(posId);
    const newPos = availablePositions.find((p) => p.id === posId);
    if (newPos && newPos.collaterals?.length > 0) {
      setSelectedCollateralAsset(newPos.collaterals[0].asset);
    }
  };

  const getButtonText = () => {
    if (stepStatus === "approving") return "1/2 Approving USDG...";
    if (stepStatus === "liquidating") return "2/2 Liquidating...";
    return "Liquidate Position";
  };

  const onSubmit = async (data: LiquidateSchemaType) => {
    try {
      await liquidate({
        positionId: data.positionId,
        collateralAsset: data.collateralAsset as Address,
        debtToCover: data.debtToCover,
      });
      onCloseModal?.();
    } catch (err) {
      console.error("Liquidation workflow failed or rejected:", err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col flex-1"
    >
      <div className="flex flex-col flex-1 overflow-hidden border border-line bg-background shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-foreground">
                Liquidate Position #{selectedPosition.id}
              </p>
            </div>
            <p className="mt-1 text-xs text-foreground/40">
              Repay USDG debt on an undercollateralized position to seize collateral rewards.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5">
            <ZapIcon className="size-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">
              Liquidatable (HF: {selectedPosition.healthFactor?.formatted ?? "—"})
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8">
            {/* Position Selector if multiple */}
            {availablePositions.length > 1 && (
              <div className="mb-8">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-foreground/40">
                  Select Target Position
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {availablePositions.map((pos) => {
                    const isSelected = pos.id === selectedPositionId;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => handleSelectPosition(pos.id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all",
                          isSelected
                            ? "border-foreground/20 bg-secondary"
                            : "border-line bg-background hover:border-foreground/20",
                        )}
                      >
                        <div>
                          <p className="font-mono text-xs font-medium">
                            Position #{pos.id}
                          </p>
                          <p className="mt-1 text-xs text-foreground/50">
                            Debt: {formatCurrency(Number(pos.debt?.formatted ?? "0"))} | Collateral: {formatCurrency(Number(pos.collateralUsd?.formatted ?? "0"))}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border",
                            isSelected
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
              </div>
            )}

            {/* Input Section */}
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground/50">
                    Debt to cover (USDG)
                  </p>

                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <WalletIcon className="size-3" />
                    <span>Balance: {formatCurrency(usdgUnitBalance)}</span>
                    <span className="font-semibold text-emerald-600 underline ml-1">
                      MAX
                    </span>
                  </button>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-5xl md:text-6xl">$</p>
                  <CurrencyInputField
                    control={control}
                    name="debtToCover"
                    placeholder={formatCurrency("0.00", false)}
                    className="h-16 -ml-2 rounded-none focus-visible:ring-0 border-0 shadow-none bg-transparent px-0 font-heading text-5xl font-normal tracking-tight md:text-6xl"
                  />
                </div>
                <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/50">
                  Enter the amount of USDG debt you wish to repay to trigger the collateral seizure.
                </p>
              </div>
            </div>

            {/* Quick Amount Selector */}
            <div className="mt-6 flex gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs font-mono font-medium text-foreground/60 transition-all hover:border-foreground/20 hover:bg-secondary",
                    activePct === pct ? "bg-secondary" : "border-line bg-background",
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Select Collateral Asset to Seize */}
            <div className="mt-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-foreground/40">
                Select Collateral Asset to Seize
              </p>
              {collaterals.length === 0 ? (
                <div className="rounded-lg border border-line p-4 text-center text-xs text-foreground/50">
                  No collateral assets available in this position.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {collaterals.map((item) => {
                    const isSelected =
                      item.asset.toLowerCase() ===
                      selectedCollateralAsset.toLowerCase();
                    return (
                      <button
                        key={item.asset}
                        type="button"
                        onClick={() => setSelectedCollateralAsset(item.asset)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all",
                          isSelected
                            ? "border-foreground/20 bg-secondary"
                            : "border-line bg-background hover:border-foreground/20",
                        )}
                      >
                        <div>
                          <p className="font-mono text-xs font-medium">
                            {item.symbol}
                          </p>
                          <p className="mt-1 text-xs text-foreground/50">
                            Available: {item.value?.formatted} {item.symbol}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border",
                            isSelected
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

            {/* Error message display if any */}
            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <p>{error.message || "An error occurred during liquidation."}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Metrics & Actions */}
        <div className="flex flex-col w-full items-center pb-4">
          <div className="bg-secondary/40 w-full border-y border-line">
            <div className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Total Debt</p>
                <p className="mt-1 text-lg font-medium font-mono text-destructive">
                  {formatCurrency(targetDebt)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Debt to Cover</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {formatCurrency(debtToCoverAmount)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Collateral Seizing</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {selectedCollateralItem?.symbol ?? "—"}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">USDG Balance</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {formatCurrency(usdgUnitBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-4 px-6 pt-4">
            <Button
              disabled={isProcessing}
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
              disabled={isProcessing || !isValid || debtToCoverAmount <= 0}
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
