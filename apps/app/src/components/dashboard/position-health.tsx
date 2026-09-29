"use client";

import { IPortfolio } from "@/interfaces/creddit-lens.interface";
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";

interface PositionHealthCardProps {
  portfolio?: IPortfolio;
}

export function PositionHealthCard({ portfolio }: PositionHealthCardProps) {
  // 1. Convert optional raw BigInt values safely
  const totalDebt = portfolio ? Number(portfolio.debtUsd.raw) : 0;
  const totalCollateral = portfolio ? Number(portfolio.collateralUsd.raw) : 0;

  // 2. Compute Current LTV (Loan-to-Value) %
  const ltv = totalCollateral > 0 ? (totalDebt / totalCollateral) * 100 : 0;

  // 3. Use weighted Liquidation Threshold % directly from contract BPS (e.g. 8000 BPS -> 80%)
  const liquidationThreshold = portfolio ? portfolio.weightedLtvBps / 100 : 0;

  // 4. Handle Health Status & Health Factor
  const isInfiniteHealth =
    !portfolio ||
    totalDebt === 0 ||
    portfolio.totalHealthFactorWad ===
      Number(BigInt(2) ** BigInt(256) - BigInt(1));

  const healthFactorDecimal = isInfiniteHealth
    ? Infinity
    : portfolio.totalHealthFactorWad / 1e18;

  // Liquidatable if HF < 1.0 or LTV meets/exceeds liquidation threshold
  const isLiquidatable =
    totalDebt > 0 && (healthFactorDecimal < 1.0 || ltv >= liquidationThreshold);

  // At risk if flagged on-chain, or approaching threshold (HF < 1.15 or LTV > 85% of threshold)
  const isAtRisk =
    !isLiquidatable &&
    totalDebt > 0 &&
    (portfolio?.hasAtRiskPosition ||
      healthFactorDecimal < 1.15 ||
      ltv >= liquidationThreshold * 0.85);

  return (
    <section className="border lg:border-l-0 border-foreground/10 bg-background p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground/50">Position Health</p>
            {portfolio?.isStale && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full"
                title="One or more oracle prices are stale"
              >
                <AlertCircle className="h-3 w-3" />
                Stale Price
              </span>
            )}
          </div>

          {/* Dynamic Health Badge */}
          <div className="flex items-center gap-2">
            {isLiquidatable ? (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                </span>
                <span className="text-sm font-medium text-destructive">
                  Liquidatable
                </span>
              </>
            ) : isAtRisk ? (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </span>
                <span className="text-sm font-medium text-amber-600">
                  At Risk
                </span>
              </>
            ) : (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </span>
                <span className="text-sm font-medium text-emerald-600">
                  Healthy
                </span>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {isInfiniteHealth ? "∞" : healthFactorDecimal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/50">LTV</span>
          <span className="text-sm font-medium text-foreground">
            {ltv.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/50">
            Liquidation Threshold
          </span>
          <span className="text-sm font-medium text-foreground">
            {liquidationThreshold.toFixed(1)}%
          </span>
        </div>

        {/* Progress Bar with Liquidation Marker */}
        <div className="relative pt-2">
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${
                isLiquidatable
                  ? "bg-destructive"
                  : isAtRisk
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(ltv, 100)}%` }}
            />
          </div>

          {/* Liquidation Threshold Marker Line */}
          {liquidationThreshold > 0 && (
            <div
              className="absolute top-0 h-5 w-px bg-foreground/60"
              style={{ left: `${Math.min(liquidationThreshold, 100)}%` }}
              title={`Liquidation threshold at ${liquidationThreshold.toFixed(1)}%`}
            />
          )}
        </div>

        <div className="flex justify-between text-[11px] text-foreground/40">
          <span>0%</span>
          <span>Liquidation threshold</span>
          <span>100%</span>
        </div>
      </div>
    </section>
  );
}
