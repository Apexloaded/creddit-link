import { ICreditLimit } from "@/interfaces/credit-limit.interface";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, Wallet } from "lucide-react";

type Props = {
  userShares: string;
  balance: string;
};

export function BalanceOverview({ balance, userShares }: Props) {
  const total = parseFloat(balance) + parseFloat(userShares);
  return (
    <section className="border lg:border-r-0 border-foreground/10 bg-background p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-foreground/80">Total Balance</p>

          <div className="mt-4 flex items-end gap-2">
            <h2 className="font-serif text-3xl tracking-tight text-foreground">
              {formatCurrency(total)}
            </h2>
          </div>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/10 bg-primary">
          <Wallet className="h-4 w-4 text-background" />
        </div>
      </div>

      <div className="mt-4 space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/80">Collateral</span>
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(balance)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/80">USDG Pool</span>
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(userShares)}
          </span>
        </div>
      </div>
    </section>
  );
}
