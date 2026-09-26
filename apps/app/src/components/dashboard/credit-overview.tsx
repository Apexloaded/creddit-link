import { ICreditLimit } from "@/interfaces/credit-limit.interface";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, InfoIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  creditLimit?: ICreditLimit;
  isLoading: boolean;
};

export function CreditOverview({ creditLimit, isLoading }: Props) {
  const borrowed = 6800;
  const totalCredit = 25220;
  const availableCredit = totalCredit - borrowed;
  const utilization = (borrowed / totalCredit) * 100;

  return (
    <section className="border border-y-0 lg:border-y-1 border-foreground/10 bg-background shadow-md p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground/50">Available Credit</p>

          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="h-8 w-40 rounded-none" />
            ) : (
              <div className="relative flex justify-between">
                <h2 className="font-serif text-3xl tracking-tight text-foreground">
                  {creditLimit ? formatCurrency(creditLimit?.limit) : "$0.00"}
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
                          This is a stale credit limit and cannot be borrowed against.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 bg-primary">
          <ArrowUpRight className="h-4 w-4 text-background" />
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-foreground/50">Used</span>

          <span className="font-medium text-foreground">
            ${borrowed.toLocaleString()} / ${totalCredit.toLocaleString()}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${utilization}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-foreground/40">
          <span>{utilization.toFixed(1)}% utilized</span>
          <span>${availableCredit.toLocaleString()} available</span>
        </div>
      </div>
    </section>
  );
}
