"use client";

import { IPortfolio } from "@/interfaces/creddit-lens.interface";
import {
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { StatBar, StatCard, StatHero, StatRow, StatRows } from "./stat-card";

interface PositionHealthCardProps {
  portfolio?: IPortfolio;
}

const STATUS = {
  liquidatable: {
    label: "Liquidatable",
    Icon: ShieldAlert,
    text: "text-destructive",
    soft: "bg-destructive/10",
    bar: "bg-destructive",
  },
  atRisk: {
    label: "At risk",
    Icon: AlertTriangle,
    text: "text-amber-600",
    soft: "bg-amber-500/10",
    bar: "bg-amber-500",
  },
  healthy: {
    label: "Healthy",
    Icon: ShieldCheck,
    text: "text-emerald-600",
    soft: "bg-emerald-500/10",
    bar: "bg-emerald-500",
  },
} as const;

export function PositionHealthCard({ portfolio }: PositionHealthCardProps) {
  const totalDebt = portfolio ? Number(portfolio.debtUsd.raw) : 0;
  const totalCollateral = portfolio ? Number(portfolio.collateralUsd.raw) : 0;
  const ltv = totalCollateral > 0 ? (totalDebt / totalCollateral) * 100 : 0;
  const liquidationThreshold = portfolio ? portfolio.weightedLtvBps / 100 : 0;

  const isInfiniteHealth =
    !portfolio ||
    totalDebt === 0 ||
    portfolio.totalHealthFactorWad ===
      Number(BigInt(2) ** BigInt(256) - BigInt(1));

  const healthFactorDecimal = isInfiniteHealth
    ? Infinity
    : portfolio.totalHealthFactorWad / 1e18;

  const isLiquidatable =
    totalDebt > 0 && (healthFactorDecimal < 1.0 || ltv >= liquidationThreshold);

  const isAtRisk =
    !isLiquidatable &&
    totalDebt > 0 &&
    (portfolio?.hasAtRiskPosition ||
      healthFactorDecimal < 1.15 ||
      ltv >= liquidationThreshold * 0.85);

  const status = isLiquidatable
    ? STATUS.liquidatable
    : isAtRisk
      ? STATUS.atRisk
      : STATUS.healthy;

  const buffer = Math.max(0, liquidationThreshold - ltv);

  return (
    <StatCard
      title="Position health"
      titleExtra={
        portfolio?.isStale && (
          <Tooltip>
            <TooltipTrigger>
              <span className="inline-flex cursor-help text-destructive">
                <AlertCircle className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-60">
              <p className="text-center">One or more oracle prices are stale</p>
            </TooltipContent>
          </Tooltip>
        )
      }
      action={
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.soft} ${status.text}`}
        >
          <status.Icon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      }
    >
      <StatHero value={`${ltv.toFixed(1)}%`} caption="Current loan-to-value" />

      <div className="mb-6 mt-6">
        <StatBar
          value={ltv}
          barClassName={status.bar}
          marker={liquidationThreshold}
        />

        {/* Scale: 0% / threshold marker label / 100% */}
        <div className="relative mt-2 h-4 text-[11px] text-foreground/40">
          <span className="absolute left-0">0%</span>
          {liquidationThreshold > 0 && (
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap font-medium text-foreground/70"
              style={{
                left: `${Math.min(92, Math.max(8, liquidationThreshold))}%`,
              }}
            >
              Limit {liquidationThreshold.toFixed(0)}%
            </span>
          )}
          <span className="absolute right-0">100%</span>
        </div>
      </div>

      <StatRows>
        <StatRow
          label="Health factor"
          value={isInfiniteHealth ? "∞" : `${healthFactorDecimal.toFixed(2)}x`}
          valueClassName={status.text}
        />
        <StatRow
          label="Buffer to liquidation"
          value={`${buffer.toFixed(1)} pts`}
        />
      </StatRows>
    </StatCard>
  );
}
