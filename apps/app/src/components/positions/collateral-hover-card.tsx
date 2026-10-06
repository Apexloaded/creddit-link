import { formatCurrency } from "@/lib/utils";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { TokenLogo } from "../ui/token-logo";
import { useCreddit } from "@/context/creddit.context";
import { useMemo } from "react";

type CollateralHoverCardProps = {
  position: IPosition;
  maxIcon?: number;
};

// Per-asset accent, shared by the allocation bar and the row dots
const ACCENTS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

export function CollateralHoverCard({
  position,
  maxIcon = 3,
}: CollateralHoverCardProps) {
  const { assets } = useCreddit();
  const { collaterals, collateralUsd, creditLimitUsd } = position;
  const visible = collaterals.slice(0, maxIcon);
  const extra = collaterals.length - visible.length;

  const total = Number(collateralUsd.formatted) || 0;

  const rows = useMemo(() => {
    const priced = collaterals.map((c, i) => {
      const price = Number(
        assets.find((a) => a.symbol === c.symbol)?.usdPrice ?? 0,
      );
      const amount = Number(c.value.formatted) || 0;
      return {
        ...c,
        amount,
        usdValue: amount * price,
        accent: ACCENTS[i % ACCENTS.length],
      };
    });

    return priced.map((r) => ({
      ...r,
      share: total > 0 ? (r.usdValue / total) * 100 : 0,
    }));
  }, [assets, collaterals, total]);

  return (
    <HoverCard>
      <HoverCardTrigger delay={100} closeDelay={80}>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View ${collaterals.length} collateral assets`}
          className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex -space-x-2">
            {visible.map((cl, i) => (
              <TokenLogo
                key={`${cl.symbol}-${i}`}
                symbol={cl.symbol}
                size={24}
                className="ring-2 ring-background"
              />
            ))}
          </span>
          {extra > 0 && (
            <span className="ml-1.5 text-xs font-medium tabular-nums text-muted-foreground">
              +{extra}
            </span>
          )}
        </button>
      </HoverCardTrigger>

      <HoverCardContent
        align="start"
        sideOffset={8}
        className="w-80 overflow-hidden rounded-xl border-line p-0 shadow-xl"
      >
        {/* hero */}
        <div className="px-4 pb-4 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total collateral
            </span>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              #{position.id}
            </span>
          </div>

          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(collateralUsd.formatted)}
          </p>

          {/* allocation bar */}
          <div
            className="mt-3.5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label="Collateral allocation by asset"
          >
            {rows.map((r, i) => (
              <div
                key={`${r.symbol}-${i}`}
                className={`${r.accent} first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${r.share}%` }}
              />
            ))}
          </div>
        </div>

        {/* assets */}
        <ul className="max-h-60 divide-y divide-line overflow-y-auto border-t border-line">
          {rows.map((r, i) => (
            <li
              key={`${r.symbol}-${i}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/60"
            >
              <TokenLogo symbol={r.symbol} size={30} className="ring-0" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {r.symbol}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${r.accent}`} />
                  <span className="tabular-nums">{r.share.toFixed(1)}%</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {formatCurrency(r.usdValue)}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(r.amount, false)} {r.symbol}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-line bg-secondary/70 px-4 py-3.5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Available credit
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              {collaterals.length}{" "}
              {collaterals.length === 1 ? "asset" : "assets"} backing
            </p>
          </div>
          {/* TODO: swap for the real available-credit field once IPosition exposes it */}
          <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(creditLimitUsd.formatted)}
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
