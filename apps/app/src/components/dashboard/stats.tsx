"use client";

import { BalanceOverview } from "@/components/dashboard/balance-overview";
import { CreditOverview } from "@/components/dashboard/credit-overview";
import { PositionHealthCard } from "@/components/dashboard/position-health";
import { useCreddit } from "@/context/creddit.context";

function DashboardStats() {
  const { portfolio, isLoadingPortfolio } = useCreddit();
  return (
    <div className="grid mt-10 lg:grid-cols-3 gap-5">
      <BalanceOverview portfolio={portfolio} />
      <CreditOverview portfolio={portfolio} isLoading={isLoadingPortfolio} />
      <PositionHealthCard portfolio={portfolio} />
    </div>
  );
}

export default DashboardStats;
