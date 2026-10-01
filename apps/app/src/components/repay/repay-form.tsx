"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowDownLeftIcon, ShieldCheckIcon, WalletIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cleanPrice, formatCurrency } from "@/lib/utils";
import { CurrencyInputField } from "../ui/currency-input";
import { useCreddit } from "@/context/creddit.context";
import { useCredditLiquidityPool } from "@/hooks/contracts/use-creddit-liquidity-pool";
import { repaySchemaResolver, RepaySchemaType } from "@/schemas";
import { useCredditLine } from "@/hooks/contracts/use-creddit-line";
import { useAppSelector } from "@/hooks";
import { getPosition } from "@/slices/position/position.slice";
import { useSearchParams } from "next/navigation";

type Props = {
  onCloseModal?: () => void;
};

export default function RepayForm({ onCloseModal }: Props) {
  const searchParams = useSearchParams();
  const rawPositionParam = searchParams.get("position");
  const { position } = useAppSelector(getPosition);

  const positionId = rawPositionParam ?? position?.id?.toString() ?? "";

  const [activePct, setActivePct] = useState<number | null>(null);
  const { usdgUnitBalance } = useCreddit();
  const { useRepay, useCurrentPositionDebt } = useCredditLine();

  const { data: debt } = useCurrentPositionDebt(positionId);

  const { repay, isProcessing, stepStatus } = useRepay(positionId);

  const { usePoolData } = useCredditLiquidityPool();
  const { isLoading: isPoolLoading } = usePoolData();

  // Replace with actual user loan positions / debt state hooks
  const userOutstandingDebt = Number(debt?.formatted ?? "0");
  const currentInterestRate = 5.2;

  const maxRepayable = Math.min(
    Number(cleanPrice(usdgUnitBalance) || 0),
    userOutstandingDebt,
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<RepaySchemaType>({
    resolver: repaySchemaResolver,
    defaultValues: {
      positionId,
      isFullRepay: false,
      amount: "",
    },
    context: {
      maxBalance: maxRepayable,
    },
    mode: "onChange",
  });

  const amount = watch("amount");
  const repayAmount = Number(cleanPrice(amount)) || 0;

  // Repayment Calculations
  const remainingDebt = Math.max(0, userOutstandingDebt - repayAmount);
  const isFullRepayment = repayAmount >= userOutstandingDebt;

  const onSubmit = async (data: RepaySchemaType) => {
    try {
      const receipt = await repay(data);
      console.log(receipt);
      onCloseModal?.();
    } catch (error) {
      console.error("Repayment workflow failed or rejected:", error);
    }
  };

  const handleMaxClick = () => {
    setActivePct(100);
    setValue("isFullRepay", true, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("amount", maxRepayable.toString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handlePercentageClick = (pct: number) => {
    setActivePct(pct);
    const isMax = pct === 100;
    const calculatedAmount = ((maxRepayable * pct) / 100).toString();

    setValue("isFullRepay", isMax, { shouldValidate: true, shouldDirty: true });
    setValue("amount", calculatedAmount, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const getButtonText = () => {
    if (stepStatus === "approving") return "1/2 Approving Token...";
    if (stepStatus === "repaying") return "2/2 Repaying...";
    if (isPoolLoading) return "Loading...";
    return "Repay USDG";
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 flex flex-col gap-3 flex-1"
    >
      <input type="hidden" {...register("positionId")} />

      <div className="flex flex-col flex-1 overflow-hidden border border-line bg-background shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-foreground">Repay Loan</p>
            </div>

            <p className="mt-1 text-xs text-foreground/40">
              Pay back outstanding USDG debt to reduce interest accrual and
              unlock pledged collateral.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line bg-secondary/50 px-3 py-1.5">
            <ArrowDownLeftIcon className="size-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-foreground/80">
              {isPoolLoading ? "..." : `${currentInterestRate}% Borrow APR`}
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
                    Repay USDG amount
                  </p>

                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <WalletIcon className="size-3" />
                    <span>Balance: {formatCurrency(usdgUnitBalance)}</span>
                    <span className="font-semibold text-blue-500 underline ml-1">
                      MAX
                    </span>
                  </button>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-5xl md:text-6xl">$</p>
                  <CurrencyInputField
                    control={control}
                    name="amount"
                    placeholder={formatCurrency("0.00", false)}
                    className="h-16 -ml-2 rounded-none focus-visible:ring-0 border-0 shadow-none bg-transparent px-0 font-heading text-5xl font-normal tracking-tight md:text-6xl"
                  />
                </div>
                <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/50">
                  Repaying reduces your interest accrual rate and lowers your
                  liquidation risk profile.
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

            {/* Debt Reduction Impact Cards */}
            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-secondary/30 p-4">
                <p className="text-xs text-foreground/40">
                  Current Outstanding Debt
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground font-mono">
                  {formatCurrency(userOutstandingDebt)}
                </p>
                <p className="mt-1 text-xs text-foreground/40">
                  Total principal & accrued interest
                </p>
              </div>

              <div className="rounded-lg border border-line bg-secondary/30 p-4">
                <p className="text-xs text-foreground/40">Remaining Debt</p>
                <p className="mt-1 text-2xl font-semibold text-blue-500 font-mono">
                  {formatCurrency(remainingDebt)}
                </p>
                <p className="mt-1 text-xs text-foreground/40">
                  {isFullRepayment
                    ? "Debt fully settled!"
                    : "After this repayment"}
                </p>
              </div>
            </div>

            {/* Collateral Unlocking Notice */}
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-line bg-background p-4 shadow-xs">
              <ShieldCheckIcon className="size-5 shrink-0 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground/90">
                  Collateral Unlocking
                </p>
                <p className="mt-1 text-xs text-foreground/50 leading-relaxed">
                  Repaying your USDG position increases your health factor and
                  allows you to safely withdraw unlocked equity collateral from
                  the protocol.
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
                <p className="text-xs text-foreground/40">Repayment Amount</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {formatCurrency(repayAmount)} USDG
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Wallet Balance</p>
                <p className="mt-1 text-lg font-medium">
                  {formatCurrency(usdgUnitBalance)}
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Interest Rate</p>
                <p className="mt-1 text-lg font-medium font-mono">
                  {currentInterestRate}% APR
                </p>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs text-foreground/40">Status Impact</p>
                <p className="mt-1 text-lg font-medium text-blue-500">
                  {isFullRepayment ? "Full Payoff" : "Partial Repay"}
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
              disabled={isProcessing || !isValid}
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
