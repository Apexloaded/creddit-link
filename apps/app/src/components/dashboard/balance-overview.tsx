import { IPortfolio } from "@/interfaces/creddit-lens.interface";
import { TrendingUp, Wallet } from "lucide-react";
import { StatCard, StatHero, StatRow, StatRows } from "./stat-card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  portfolio?: IPortfolio;
  earnings?: number;
};

export function BalanceOverview({
  portfolio,
  earnings = 1240.55,
}: Props) {
  const collateral = parseFloat(portfolio?.collateralUsd.formatted ?? "0");
  const liquidity = parseFloat(portfolio?.liquidityBalance.formatted ?? "0");

  return (
    <StatCard title="Total balance" icon={<Wallet className="h-4 w-4" />}>
      <StatHero
        value={formatCurrency(collateral, true, true)}
        caption="Across all positions"
      />

      <div className="flex-1 pb-4 items-end justify-end flex">
        <dd className={"font-medium tabular-nums text-sm text-success"}>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />+{formatCurrency(earnings)}
          </span>
        </dd>
      </div>

      <StatRows>
        <StatRow label="Collateral" value={formatCurrency(collateral)} />
        <StatRow label="cUSDG" value={formatCurrency(liquidity)} />
      </StatRows>
    </StatCard>
  );
}
