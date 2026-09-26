"use client";

import { useMemo, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "../ui/button";
import { borrowSchemaResolver, BorrowSchemaType } from "@/schemas";
import { Controller, useForm } from "react-hook-form";
import { formatCurrency } from "@/lib/utils";
import { IAsset } from "@/interfaces/asset.interface";
import { Input } from "../ui/input";

const MAX_LTV = 0.65;

type Props = {
  onCloseModal?: () => void;
  onBorrow: (value: BorrowSchemaType) => void;
  borrowText?: string;
  assets: IAsset[];
  isBorrowing: boolean;
};

export default function BorrowCreditForm({
  assets = [],
  onCloseModal,
  onBorrow,
  borrowText = "Borrow",
  isBorrowing
}: Props) {
  const validAssets = useMemo(
    () => assets.filter((a) => Boolean(a.symbol)),
    [assets],
  );

  // Store selected symbols in state
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
    assets.length > 0 ? [assets[0].symbol] : [],
  );

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
    },
  });

  // Watch the amount field directly from react-hook-form
  const amountValue = watch("amount");

  // Derive numerical borrow amount from react-hook-form value
  const borrowAmount = Number(amountValue) || 0;

  // Calculate collateral value from selected assets
  const collateralValue = useMemo(
    () =>
      assets
        .filter((asset) => selectedSymbols.includes(asset.symbol))
        .reduce((total, asset) => total + Number(asset.usdPrice || 0), 0),
    [assets, selectedSymbols],
  );

  const potentialCredit = collateralValue * MAX_LTV;

  const utilization =
    potentialCredit > 0 ? (borrowAmount / potentialCredit) * 100 : 0;

  const health =
    utilization === 0
      ? "Healthy"
      : utilization < 50
        ? "Healthy"
        : utilization < 75
          ? "Moderate"
          : "High";

  const healthDot =
    health === "Healthy"
      ? "bg-emerald-500"
      : health === "Moderate"
        ? "bg-amber-500"
        : "bg-red-500";

  const toggleAsset = (symbol: string) => {
    setSelectedSymbols((current) => {
      const exists = current.includes(symbol);
      return exists
        ? current.filter((item) => item !== symbol)
        : [...current, symbol];
    });

    // Reset form field value via react-hook-form
    setValue("amount", "0", { shouldValidate: true });
  };

  return (
    <form
      onSubmit={handleSubmit(onBorrow)}
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
              Borrow USDG at preferential rates by locking your existing assets
              as collateral.
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

                <Controller
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-5xl md:text-6xl">$</p>
                      <Input
                        className="h-16 -ml-2 rounded-none focus-visible:ring-0 border-0 shadow-none bg-transparent px-0 font-heading text-5xl font-normal tracking-tight md:text-6xl"
                        placeholder={formatCurrency(potentialCredit, false)}
                        value={formatCurrency(value, false)}
                        onChange={onChange}
                      />
                    </div>
                  )}
                  name="amount"
                />

                <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/50">
                  The total amount of USDG to be borrowed against your unified
                  Creddit collateral
                </p>
              </div>
            </div>

            {/* Collateral selection */}
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground/40">
                  Select collateral
                </p>

                <p className="text-xs text-foreground/40">
                  {formatCurrency(collateralValue)} selected
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {validAssets.map((asset) => {
                  const selected = selectedSymbols.includes(asset.symbol);

                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => toggleAsset(asset.symbol)}
                      className={[
                        "group flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-200",
                        selected
                          ? "border-foreground/20 bg-secondary"
                          : "border-line bg-background hover:border-foreground/20 hover:bg-secondary/50",
                      ].join(" ")}
                    >
                      <div>
                        <p className="font-mono text-xs font-medium">
                          {asset.symbol}
                        </p>

                        <p className="mt-1 text-xs text-foreground/40">
                          {formatCurrency(Number(asset.usdPrice))}
                        </p>
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
                max={potentialCredit}
                step={500}
                value={Math.min(borrowAmount, potentialCredit)}
                disabled={potentialCredit === 0}
                onChange={(e) =>
                  setValue("amount", e.target.value, { shouldValidate: true })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
              />

              <div className="mt-3 flex justify-between text-xs text-foreground/40">
                <span>{formatCurrency(borrowAmount)} borrowed</span>
                <span>{formatCurrency(potentialCredit)} max</span>
              </div>
            </div>

            {/* Utilisation */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-foreground/50">Credit utilisation</span>

                <span className="font-medium">{utilization.toFixed(1)}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-300"
                  style={{
                    width: `${Math.min(utilization, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

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
                <p className="text-xs text-foreground/40">Potential credit</p>

                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(potentialCredit)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Simulated debt</p>

                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(borrowAmount)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Remaining credit</p>

                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(Math.max(potentialCredit - borrowAmount, 0))}
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
              disabled={!isValid || isBorrowing}
              size={"xl"}
              className={"flex-1"}
            >
              {borrowText}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
