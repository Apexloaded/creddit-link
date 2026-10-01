import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  icon?: ReactNode;
  /** Small adornment next to the title (e.g. a stale-price warning) */
  titleExtra?: ReactNode;
  /** Right side of the header (button, status pill) */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Shared shell so all three cards have identical padding, header height,
 * radius and shadow. The fixed header height means a button on one card
 * can never push its content out of line with its neighbours.
 */
export function StatCard({
  title,
  icon,
  titleExtra,
  action,
  children,
  className,
}: StatCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-2xl border border-foreground/10 bg-background p-6 shadow-sm",
        className,
      )}
    >
      <header className="flex h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/70">
              {icon}
            </span>
          )}
          <h3 className="truncate text-sm font-medium text-foreground/70">
            {title}
          </h3>
          {titleExtra}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** The big number + a one-line caption underneath. */
export function StatHero({
  value,
  caption,
}: {
  value: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="font-serif text-3xl leading-none tracking-tight tabular-nums text-foreground xl:text-4xl">
        {value}
      </div>
      <p className="mt-2 min-h-4 text-xs text-foreground/50">{caption}</p>
    </div>
  );
}

/** Label / value rows pinned to the bottom of the card. */
export function StatRows({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-auto space-y-3 border-t border-foreground/10 pt-5">
      {children}
    </dl>
  );
}

export function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-foreground/60">{label}</dt>
      <dd
        className={cn(
          "font-medium tabular-nums text-foreground",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Progress bar with an optional vertical marker (e.g. liquidation threshold). */
export function StatBar({
  value,
  barClassName = "bg-primary",
  marker,
}: {
  value: number;
  barClassName?: string;
  marker?: number;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative">
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {marker !== undefined && marker > 0 && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
          style={{ left: `${Math.min(100, marker)}%` }}
        />
      )}
    </div>
  );
}
