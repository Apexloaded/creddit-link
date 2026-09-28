"use client";

import React from "react";
import { BalanceOverview } from "@/components/dashboard/balance-overview";
import { CreditOverview } from "@/components/dashboard/credit-overview";
import { PositionHealthCard } from "@/components/dashboard/position-health";
import { useApp } from "@/context/app.context";
import { useCreditLimit } from "@/hooks/contracts/use-credit-line";
import { useLiquidityPoolData } from "@/hooks/contracts/use-liquidity-pool";

function Dashboard() {
  const { assets, totalPositionValueUsd, positions } = useApp();
  const { formattedShare } = useLiquidityPoolData();
  const { creditLimit, isLoading } = useCreditLimit();
  console.log(creditLimit);
  return (
    <div className="grid mt-10 lg:grid-cols-3">
      <BalanceOverview
        userShares={formattedShare}
        balance={totalPositionValueUsd}
      />
      <CreditOverview creditLimit={creditLimit} isLoading={isLoading} />
      <PositionHealthCard />
    </div>
  );
}

export default Dashboard;
