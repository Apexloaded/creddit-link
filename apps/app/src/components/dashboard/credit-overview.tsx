import { IPortfolio } from "@/interfaces/creddit-lens.interface";
import { ICreditLimit } from "@/interfaces/credit-limit.interface";
import { AlertCircle, ArrowUpRight, CreditCard } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { StatBar, StatCard, StatHero, StatRow, StatRows } from "./stat-card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  creditLimit?: ICreditLimit;
  portfolio?: IPortfolio;
  isLoading: boolean;
};

function getUtilizationColor(percentage: number): string {
  if (percentage >= 85) return "bg-primary";
  if (percentage >= 65) return "bg-primary/80";
  if (percentage >= 40) return "bg-primary/60";
  return "bg-primary/40";
}

export function CreditOverview({ portfolio, isLoading }: Props) {
  const borrowed = parseFloat(portfolio?.debtUsd.formatted ?? "0");
  const creditLimit = parseFloat(portfolio?.creditLimitUsd.formatted ?? "0");
  const availableCredit = Math.max(0, creditLimit - borrowed);

  const rawUtilization = creditLimit > 0 ? (borrowed / creditLimit) * 100 : 0;
  const utilization = Math.min(100, Math.max(0, rawUtilization));

  return (
    <StatCard
      title="Available credit"
      icon={<CreditCard className="h-4 w-4" />}
      titleExtra={
        portfolio?.isStale && (
          <Tooltip>
            <TooltipTrigger>
              <span className="inline-flex cursor-help text-amber-600">
                <AlertCircle className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-60">
              <p className="text-center">
                This credit limit is stale and can&apos;t be borrowed against.
              </p>
            </TooltipContent>
          </Tooltip>
        )
      }
      action={
        utilization > 0 && (
          <Button size="sm" className="h-8 gap-1.5">
            <ArrowUpRight className="h-4 w-4" />
            Repay
          </Button>
        )
      }
    >
      <StatHero
        value={
          isLoading ? (
            <Skeleton className="h-9 w-44 rounded-md" />
          ) : (
            formatCurrency(availableCredit, true, true)
          )
        }
        caption="Available to borrow"
      />

      <div className="mb-6 mt-6">
        <StatBar
          value={utilization}
          barClassName={getUtilizationColor(utilization)}
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-foreground/60">Credit used</span>
          <span className="font-medium tabular-nums text-foreground">
            {utilization.toFixed(1)}%
          </span>
        </div>
      </div>

      <StatRows>
        <StatRow label="Borrowed" value={formatCurrency(borrowed)} />
        <StatRow label="Credit limit" value={formatCurrency(creditLimit)} />
      </StatRows>
    </StatCard>
  );
}
