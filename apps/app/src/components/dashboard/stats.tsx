"use client";

import { BalanceOverview } from "@/components/dashboard/balance-overview";
import { CreditOverview } from "@/components/dashboard/credit-overview";
import { PositionHealthCard } from "@/components/dashboard/position-health";
import { useCreddit } from "@/context/creddit.context";
import { useCredditLine } from "@/hooks/contracts/use-creddit-line";

function DashboardStats() {
  const { portfolio, isLoadingPortfolio } = useCreddit();
  const { useGetPositionDebt } = useCredditLine();

  const { data } = useGetPositionDebt("1");
  console.log(data);

  return (
    <div className="grid mt-10 lg:grid-cols-3 gap-5">
      <BalanceOverview portfolio={portfolio} />
      <CreditOverview portfolio={portfolio} isLoading={isLoadingPortfolio} />
      <PositionHealthCard portfolio={portfolio} />
    </div>
  );
}

export default DashboardStats;
