import { ICreditLimit } from "@/interfaces/credit-limit.interface";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, InfoIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";

type Props = {
  creditLimit?: ICreditLimit;
  isLoading: boolean;
};

function getUtilizationColor(percentage: number): string {
  if (percentage >= 85) return "bg-primary";
  if (percentage >= 65) return "bg-primary/80";
  if (percentage >= 40) return "bg-primary/60";
  return "bg-primary/40";
}

export function CreditOverview({ creditLimit, isLoading }: Props) {
  console.log(creditLimit);
  const borrowed = parseFloat(creditLimit?.userDebt ?? "0");
  const totalCredit = parseFloat(creditLimit?.limit ?? "0");
  const availableCredit = Math.max(0, totalCredit - borrowed);

  // Guard against division by zero
  const rawUtilization = totalCredit > 0 ? (borrowed / totalCredit) * 100 : 0;
  // Cap visual width at 100%
  const utilization = Math.min(100, Math.max(0, rawUtilization));

  const progressColorClass = getUtilizationColor(utilization);

  return (
    <section className="border border-y-0 lg:border-y-1 border-foreground/10 bg-background p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground/80">Available Credit</p>

          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="h-8 w-40 rounded-none" />
            ) : (
              <div className="relative flex justify-between">
                <h2 className="font-serif text-3xl tracking-tight text-foreground">
                  {creditLimit ? formatCurrency(availableCredit) : "$0.00"}
                </h2>
                {creditLimit?.isStale && (
                  <div className="h-5 absolute -right-6 bottom-2 flex items-center gap-1 justify-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon
                          size={18}
                          className="cursor-pointer text-destructive"
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className={"w-60"}>
                        <p className="text-center">
                          This is a stale credit limit and cannot be borrowed
                          against.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {utilization > 0 ? (
          <Button className="h-9">
            <ArrowUpRight className="h-4 w-4 text-background" />
            <p>Repay</p>
          </Button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 bg-primary">
            <ArrowUpRight className="h-4 w-4 text-background" />
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-foreground/80">Used</span>

          <span className="font-medium text-foreground">
            ${borrowed.toLocaleString()} - {formatCurrency(totalCredit)}
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressColorClass}`}
            style={{ width: `${utilization}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-foreground/60">
          <span>{utilization.toFixed(1)}% utilized</span>
          <span>${availableCredit.toLocaleString()} available</span>
        </div>
      </div>
    </section>
  );
}
