"use client";

import { BalanceOverview } from "@/components/dashboard/balance-overview";
import { CreditOverview } from "@/components/dashboard/credit-overview";
import { PositionHealthCard } from "@/components/dashboard/position-health";
import { useCreddit } from "@/context/creddit.context";
import { useLiquidityPoolData } from "@/hooks/contracts/use-liquidity-pool";

function Dashboard() {
  const { assets, portfolio, isLoadingPortfolio, positions } = useCreddit();
  const { formattedShare } = useLiquidityPoolData();
  console.log(portfolio);

  return (
    <div className="grid mt-10 lg:grid-cols-3">
      <BalanceOverview portfolio={portfolio} />
      <CreditOverview portfolio={portfolio} isLoading={isLoadingPortfolio} />
      <PositionHealthCard portfolio={portfolio} />
    </div>
  );
}

export default Dashboard;
