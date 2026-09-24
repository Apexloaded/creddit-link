"use client";

import {
  ActivityIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  GaugeIcon,
  ShieldCheckIcon,
} from "lucide-react";

const riskMetrics = [
  {
    label: "Max LTV",
    value: "65%",
    description: "Maximum credit capacity against eligible collateral.",
    icon: GaugeIcon,
  },
  {
    label: "Liquidation Threshold",
    value: "70%",
    description: "Position threshold at which liquidation may become available.",
    icon: ShieldCheckIcon,
  },
  {
    label: "Liquidation Penalty",
    value: "8%",
    description: "Protocol-defined penalty applied during liquidation.",
    icon: ActivityIcon,
  },
];

const protections = [
  {
    number: "01",
    title: "Defined risk parameters",
    description:
      "Borrowing capacity and liquidation conditions are governed by explicit protocol parameters rather than discretionary decisions.",
  },
  {
    number: "02",
    title: "Oracle-based valuation",
    description:
      "Collateral values are derived from onchain price feeds so credit capacity reflects current market conditions.",
  },
  {
    number: "03",
    title: "Transparent positions",
    description:
      "Collateral, debt, liquidity, and liquidation activity can be independently verified onchain.",
  },
];

export default function RiskAndTransparency() {
  return (
    <section className="border-t border-foreground/10 bg-background py-24 md:py-32">
      <div className="mx-auto wrap px-6">
        {/* Header */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-foreground/40">
              Risk & Transparency
            </div>

            <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
              Credit governed by transparent risk.
            </h2>

            <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-foreground/55">
              Creddit uses defined collateral parameters, oracle-based
              valuations, and onchain risk controls to determine how much
              credit each position can support.
            </p>
          </div>

          <a
            href="/risk"
            className="group inline-flex shrforeground-0 items-center gap-2 text-sm font-medium text-foreground"
          >
            Explore risk framework
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Risk metrics */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-foreground/10">
          <div className="grid md:grid-cols-3">
            {riskMetrics.map((metric, index) => {
              const Icon = metric.icon;

              return (
                <div
                  key={metric.label}
                  className={`group relative bg-secondary p-7 transition-colors duration-300 hover:bg-background md:p-8 ${
                    index < riskMetrics.length - 1
                      ? "border-b border-foreground/10 md:border-b-0 md:border-r"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background text-foreground/55 transition-colors group-hover:border-foreground/20 group-hover:text-foreground">
                      <Icon className="h-4 w-4" />
                    </div>

                    <CircleCheckIcon className="h-4 w-4 text-foreground/25" />
                  </div>

                  <div className="mt-10">
                    <div className="text-[0.68rem] font-medium uppercase tracking-[0.13em] text-foreground/35">
                      {metric.label}
                    </div>

                    <div className="mt-2 font-serif text-4xl font-medium tracking-tight text-foreground">
                      {metric.value}
                    </div>

                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/45">
                      {metric.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Protection layer */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-foreground/10">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
            {/* Visual */}
            <div className="relative min-h-[360px] overflow-hidden bg-secondary p-8 md:p-10">
              <div className="absolute inset-0 text-primary opacity-[0.035] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:70px_70px]" />

              <div className="relative flex h-full min-h-[300px] items-center justify-center">
                {/* Risk ring */}
                <div className="relative flex size-80 items-center justify-center rounded-full border-2 border-primary/60">
                  <div className="absolute inset-7 rounded-full border-2 border-primary/60" />

                  <div className="absolute inset-14 rounded-full border-2 border-primary/60" />

                  <div className="relative flex size-36 flex-col items-center justify-center rounded-full border-2 border-primary/60 bg-background shadow-sm">
                    <ShieldCheckIcon className="size-10 text-primary" />

                    <span className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-primary">
                      Protected
                    </span>
                  </div>

                  {/* Labels */}
                  <div className="absolute text-center w-36 -top-2 left-1/2 -translate-x-1/2 rounded-full border border-primary shadow-md bg-background px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-foreground/45">
                    Risk parameters
                  </div>

                  <div className="absolute text-center w-36 -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-primary shadow-md bg-background px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-foreground/45">
                    Onchain state
                  </div>

                  <div className="absolute text-center w-26 -left-8 top-1/2 -translate-y-1/2 rounded-full border border-primary shadow-md bg-background px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-foreground/45">
                    Oracle
                  </div>

                  <div className="absolute text-center w-26 -right-8 top-1/2 -translate-y-1/2 rounded-full border border-primary shadow-md bg-background px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-foreground/45">
                    Liquidation
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 lg:p-12">
              <div className="max-w-xl">
                <div className="text-[0.68rem] font-medium uppercase tracking-[0.13em] text-foreground/35">
                  Built into the protocol
                </div>

                <h3 className="mt-3 font-serif text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                  Risk is part of the architecture.
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-foreground/50">
                  Every credit position is evaluated against the same
                  transparent rules. Collateral value, borrowing capacity, and
                  liquidation conditions are determined by protocol logic.
                </p>

                <div className="mt-10 space-y-7">
                  {protections.map((item) => (
                    <div key={item.number} className="flex gap-5">
                      <div className="shrforeground-0 text-[0.68rem] font-medium tracking-[0.12em] text-foreground/25">
                        {item.number}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-foreground">
                          {item.title}
                        </h4>

                        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-foreground/45">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-10 flex flex-col gap-5 border-t border-foreground/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-foreground/45">
            Transparent parameters. Observable positions. Rules enforced
            directly by the protocol.
          </p>

          <a
            href="/explorer"
            className="group inline-flex shrforeground-0 items-center gap-2 text-sm font-medium text-foreground"
          >
            View on Explorer
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}