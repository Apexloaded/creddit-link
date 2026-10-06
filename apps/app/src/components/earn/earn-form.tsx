"use client";

import { useState } from "react";
import { TrendingUpIcon, ShieldCheckIcon, WalletIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cleanPrice, formatCurrency } from "@/lib/utils";
import { useCreddit } from "@/context/creddit.context";
import { useCredditLiquidityPool } from "@/hooks/contracts/use-creddit-liquidity-pool";
import { useEarnCalculations } from "@/hooks";
import { useForm } from "react-hook-form";
import {
  poolDepositSchemaResolver,
  PoolDepositSchemaType,
} from "@/schemas/pool.schema";
import { CurrencyInputField } from "../ui/currency-input";

type Props = {
  onCloseModal?: () => void;
};

export default function EarnForm({ onCloseModal }: Props) {
  const [activePct, setActivePct] = useState<number | null>(null);
  const { usdgUnitBalance } = useCreddit();
  const { usePoolData, useDeposit } = useCredditLiquidityPool();
  const { deposit, isProcessing, stepStatus } = useDeposit();

  const {
    setValue,
    watch,
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<PoolDepositSchemaType>({
    resolver: poolDepositSchemaResolver,
    defaultValues: { amount: "" },
    mode: "onChange",
  });

  const amount = watch("amount");

  const {
    currentDebt,
    availableLiquidity,
    borrowRateBps,
    totalAssets,
    isLoading: isPoolLoading,
  } = usePoolData();

  const {
    supplyAPY,
    utilizationPct,
    estimatedMonthlyYieldUSDG,
    estimatedAnnualYieldUSDG,
    totalLiquidityFormatted,
  } = useEarnCalculations({
    currentDebt,
    availableLiquidity,
    borrowRateBps,
    userDepositInput: cleanPrice(amount),
  });

  const depositAmount = Number(cleanPrice(amount)) || 0;

  const mockData = {
    netApy: 8.45,
    totalPoolLiquidity: 2450000,
    utilizationRate: 68.2,
    collateralBackingUsd: 3820000,
  };

  // Calculations based on input
  const estimatedShares = depositAmount > 0 ? depositAmount * 1.0 : 0; // 1:1 initial placeholder
  const estimatedAnnualYield = (depositAmount * mockData.netApy) / 100;
  const estimatedMonthlyYield = estimatedAnnualYield / 12;

  const onSubmit = async (data: PoolDepositSchemaType) => {
    try {
      const receipt = await deposit(data.amount);
      onCloseModal?.();
    } catch (error) {
      console.error("Deposit workflow failed or rejected:", error);
    }
  };

  const handleMaxClick = () => {
    setValue("amount", usdgUnitBalance);
  };

  const getButtonText = () => {
    if (stepStatus === "approving") return "1/2 Approving Token...";
    if (stepStatus === "depositing") return "2/2 Supplying...";
    return "Supply USDG";
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
              <p className="text-xl font-bold text-foreground">Supply & Earn</p>
            </div>

            <p className="mt-1 text-xs text-foreground/40">
              Provide USDG liquidity to the pool to earn continuous real yield
              generated from borrower interest.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line bg-secondary/50 px-3 py-1.5">
            <TrendingUpIcon className="size-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground/80">
              {isPoolLoading ? "..." : `${supplyAPY}% APY`}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-scroll">
          {/* Main Content */}
          <div className="px-6 py-8">
            {/* Input Section */}
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground/50">
                    Supply USDG amount
                  </p>

                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <WalletIcon className="size-3" />
                    <span>Balance: {formatCurrency(usdgUnitBalance)}</span>
                    <span className="font-semibold text-emerald-500 underline ml-1">
                      MAX
                    </span>
                  </button>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-5xl md:text-6xl">$</p>

                  <CurrencyInputField
                    control={control}
                    name="amount"
                    className="h-16 -ml-1 rounded-none focus-visible:ring-0 border-0 shadow-none bg-transparent px-0 font-heading text-5xl font-normal tracking-tight md:text-6xl"
                  />
                </div>

                <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/50">
                  You will receive cUSDG shares representing your ownership in
                  the yield-generating vault.
                </p>
              </div>
            </div>

            {/* Quick Amount Selector */}
            <div className="mt-6 flex gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setActivePct(pct);
                    setValue(
                      "amount",
                      ((Number(usdgUnitBalance) * pct) / 100).toString(),
                    );
                  }}
                  className={`flex-1 rounded-md border py-1.5 text-xs font-mono font-medium text-foreground/60 transition-all hover:border-foreground/20 hover:bg-secondary ${
                    activePct === pct
                      ? "bg-secondary"
                      : "border-line bg-background"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Yield Projection Cards */}
            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-secondary/30 p-4">
                <p className="text-xs text-foreground/40">
                  Est. Monthly Earnings
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-500 font-mono">
                  +{formatCurrency(estimatedMonthlyYieldUSDG)}
                </p>
                <p className="mt-1 text-xs text-foreground/40">
                  Based on current pool APY
                </p>
              </div>

              <div className="rounded-lg border border-line bg-secondary/30 p-4">
                <p className="text-xs text-foreground/40">
                  Est. Annual Earnings
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-500 font-mono">
                  +{formatCurrency(estimatedAnnualYieldUSDG)}
                </p>
                <p className="mt-1 text-xs text-foreground/40">
                  Accrues directly to share price
                </p>
              </div>
            </div>

            {/* Security Guarantee Banner */}
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-line bg-background p-4 shadow-xs">
              <ShieldCheckIcon className="size-5 shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground/90">
                  Over-Collateralized Protection
                </p>
                <p className="mt-1 text-xs text-foreground/50 leading-relaxed">
                  Liquidity is protected by{" "}
                  {formatCurrency(mockData.collateralBackingUsd)} in equity
                  assets (AAPL, SPY, AMZN). Automated liquidation safeguards
                  ensure LP principal security.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics & Actions */}
        <div className="flex flex-col w-full items-center pb-4">
          <div className="bg-secondary/40 w-full border-y border-line">
            <div className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Expected Shares</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {formatCurrency(estimatedShares, false)} cUSDG
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Pool Liquidity</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(mockData.totalPoolLiquidity)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Pool Utilization</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {mockData.utilizationRate}%
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Lockup Period</p>
                <p className="mt-1 text-lg font-medium text-emerald-500">
                  None (Instant)
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-4 px-6 pt-4">
            <Button
              disabled={isProcessing}
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
              disabled={depositAmount <= 0 || isProcessing || !isValid}
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
