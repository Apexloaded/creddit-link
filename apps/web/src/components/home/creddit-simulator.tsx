"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

type Asset = {
  symbol: string;
  value: number;
};

const assets: Asset[] = [
  { symbol: "AAPL", value: 20000 },
  { symbol: "NVDA", value: 15000 },
  { symbol: "TSLA", value: 10000 },
  { symbol: "AMZN", value: 5000 },
];

const MAX_LTV = 0.65;

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CredditSimulator() {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([
    "NVDA",
    "TSLA",
  ]);

  const [borrowAmount, setBorrowAmount] = useState(0);

  const collateralValue = useMemo(
    () =>
      assets
        .filter((asset) => selectedAssets.includes(asset.symbol))
        .reduce((total, asset) => total + asset.value, 0),
    [selectedAssets]
  );

  const potentialCredit = collateralValue * MAX_LTV;

  const utilization =
    potentialCredit > 0 ? (borrowAmount / potentialCredit) * 100 : 0;

  const health =
    utilization === 0
      ? "Healthy"
      : utilization < 50
        ? "Healthy"
        : utilization < 75
          ? "Moderate"
          : "High";

  const healthDot =
    health === "Healthy"
      ? "bg-emerald-500"
      : health === "Moderate"
        ? "bg-amber-500"
        : "bg-red-500";

  const toggleAsset = (symbol: string) => {
    setSelectedAssets((current) => {
      const exists = current.includes(symbol);

      if (exists) {
        const next = current.filter((item) => item !== symbol);

        if (next.length === 0) {
          setBorrowAmount(0);
        }

        return next;
      }

      return [...current, symbol];
    });

    setBorrowAmount(0);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground/60">
              Your Potential Credit
            </p>

            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/40">
              Simulation
            </span>
          </div>

          <p className="mt-1 text-xs text-foreground/40">
            See how your collateral could translate into credit.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
          <span className={`size-1.5 rounded-full ${healthDot}`} />

          <span className="text-xs font-medium text-foreground/60">
            {health}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-foreground/50">
              Potential credit
            </p>

            <div className="mt-2 flex items-baseline gap-2">
              <span
                key={potentialCredit}
                className="animate-[rise_.35s_ease]"
              >
                <span className="font-heading text-5xl font-normal tracking-tight md:text-6xl">
                  {formatUSD(potentialCredit)}
                </span>
              </span>

              <span className="text-sm text-foreground/40">
                USDG
              </span>
            </div>

            <p className="mt-3 max-w-md text-sm leading-6 text-foreground/50">
              Estimated borrowing capacity based on your selected
              collateral and current protocol parameters.
            </p>
          </div>

          <Link
            href="/borrow"
            className="link-btn inline-flex shrink-0 items-center justify-center"
          >
            Launch App
            <ArrowRightIcon className="ml-1 size-4" />
          </Link>
        </div>

        {/* Collateral selection */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground/40">
              Select collateral
            </p>

            <p className="text-xs text-foreground/40">
              {formatUSD(collateralValue)} selected
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {assets.map((asset) => {
              const selected = selectedAssets.includes(asset.symbol);

              return (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => toggleAsset(asset.symbol)}
                  className={[
                    "group flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-200",
                    selected
                      ? "border-foreground/20 bg-secondary"
                      : "border-line bg-background hover:border-foreground/20 hover:bg-secondary/50",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-mono text-xs font-medium">
                      {asset.symbol}
                    </p>

                    <p className="mt-1 text-xs text-foreground/40">
                      {formatUSD(asset.value)}
                    </p>
                  </div>

                  <span
                    className={[
                      "flex size-5 items-center justify-center rounded-full border transition-all duration-200",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-line text-transparent",
                    ].join(" ")}
                  >
                    <CheckIcon className="size-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Borrow simulation */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-foreground/50">
              Simulate borrowing
            </span>

            <span className="font-medium">
              {formatUSD(borrowAmount)} USDG
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={potentialCredit}
            step={500}
            value={Math.min(borrowAmount, potentialCredit)}
            disabled={potentialCredit === 0}
            onChange={(event) =>
              setBorrowAmount(Number(event.target.value))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
          />

          <div className="mt-3 flex justify-between text-xs text-foreground/40">
            <span>{formatUSD(borrowAmount)} borrowed</span>
            <span>{formatUSD(potentialCredit)} max</span>
          </div>
        </div>

        {/* Utilisation */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-foreground/50">
              Credit utilisation
            </span>

            <span className="font-medium">
              {utilization.toFixed(1)}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-300"
              style={{
                width: `${Math.min(utilization, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-line bg-secondary/40">
        <div className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
          <div className="px-5 py-5">
            <p className="text-xs text-foreground/40">
              Collateral
            </p>

            <p className="mt-1 text-lg font-medium">
              {formatUSD(collateralValue)}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-xs text-foreground/40">
              Potential credit
            </p>

            <p className="mt-1 text-lg font-medium">
              {formatUSD(potentialCredit)}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-xs text-foreground/40">
              Simulated debt
            </p>

            <p className="mt-1 text-lg font-medium">
              {formatUSD(borrowAmount)}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-xs text-foreground/40">
              Remaining credit
            </p>

            <p className="mt-1 text-lg font-medium">
              {formatUSD(Math.max(potentialCredit - borrowAmount, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}