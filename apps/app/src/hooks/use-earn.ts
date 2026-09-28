"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";

type Params = {
  currentDebt: bigint;
  availableLiquidity: bigint;
  borrowRateBps: bigint;
  userDepositInput: string; // The text typed into the UI input (e.g. "500")
};

export function useEarnCalculations({
  currentDebt,
  availableLiquidity,
  borrowRateBps,
  userDepositInput,
}: Params) {
  return useMemo(() => {
    // 1. Total Capital Pool = Free Cash + Borrowed Debt
    const totalLiquidity = availableLiquidity + currentDebt;

    console.log("TOTAL DEBT :: :: ", currentDebt);
    console.log("TOTAL LIQUIDITY ", totalLiquidity);
    console.log("USER INPUT :: :: ", userDepositInput);

    // 2. Utilization % = (currentDebt / totalLiquidity) * 100
    const utilizationPct =
      totalLiquidity > BigInt(0)
        ? (Number(currentDebt) / Number(totalLiquidity)) * 100
        : 0;

    // 3. Borrow APR from BPS (e.g. 800 bps -> 0.08 -> 8%)
    const borrowAPR = Number(borrowRateBps) / 10000;

    // 4. Supply APR = Borrow APR * Utilization Rate
    const supplyAPR = borrowAPR * (utilizationPct / 100);

    // 5. Compounded Supply APY (compounded daily)
    const supplyAPY =
      supplyAPR > 0 ? (Math.pow(1 + supplyAPR / 365, 365) - 1) * 100 : 0;

    // 6. User Earnings Projections based on text input
    const depositNum = Number(userDepositInput) || 0;
    const estimatedAnnualYieldUSDG = depositNum * (supplyAPY / 100);
    const estimatedMonthlyYieldUSDG = estimatedAnnualYieldUSDG / 12;

    return {
      totalLiquidityFormatted: formatUnits(totalLiquidity, 18),
      availableLiquidityFormatted: formatUnits(availableLiquidity, 18),
      currentDebtFormatted: formatUnits(currentDebt, 18),
      utilizationPct: utilizationPct.toFixed(1),
      borrowAPR: (borrowAPR * 100).toFixed(2),
      supplyAPY: supplyAPY.toFixed(2),
      estimatedAnnualYieldUSDG: estimatedAnnualYieldUSDG.toFixed(2),
      estimatedMonthlyYieldUSDG: estimatedMonthlyYieldUSDG.toFixed(2),
    };
  }, [currentDebt, availableLiquidity, borrowRateBps, userDepositInput]);
}
