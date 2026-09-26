"use client";

import React from "react";

import { BalanceOverview } from "@/components/dashboard/balance-overview";
import { CreditOverview } from "@/components/dashboard/credit-overview";
import { PositionHealthCard } from "@/components/dashboard/position-health";
import { useCollateralOf } from "@/hooks/contracts/use-collateral";
import { useApp } from "@/context/app.context";
import { useCreditLimit } from "@/hooks/contracts/use-credit-line";
import { useConnection } from "wagmi";

function Dashboard() {
  const { assets } = useApp();
  const { positions, totalUsdValue } = useCollateralOf(assets);
  const { creditLimit, isLoading } = useCreditLimit();

  console.log(creditLimit);

  return (
    <div className="grid mt-10 lg:grid-cols-3">
      <BalanceOverview balance={totalUsdValue} />
      <CreditOverview creditLimit={creditLimit} isLoading={isLoading} />
      <PositionHealthCard />
    </div>
  );
}

export default Dashboard;
