import { ShieldCheck } from "lucide-react";

export function PositionHealthCard() {
  const ltv = 42.8;
  const liquidationThreshold = 70;

  return (
    <section className="border lg:border-l-0 border-foreground/10 bg-background p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-between flex-1">
          <p className="text-sm text-foreground/50">Position Health</p>

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </span>

            <span className="text-sm font-medium text-emerald-600">
              Healthy
            </span>
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
          <span className="text-sm text-foreground/50">Liquidation</span>
          <span className="text-sm font-medium text-foreground">
            {liquidationThreshold}%
          </span>
        </div>

        <div className="relative pt-2">
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${ltv}%` }}
            />
          </div>

          <div
            className="absolute top-0 h-5 w-px bg-foreground/40"
            style={{ left: `${liquidationThreshold}%` }}
          />
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
