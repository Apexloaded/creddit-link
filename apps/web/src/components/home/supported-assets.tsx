"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "lucide-react";

const supportedAssets = [
  {
    symbol: "AAPL",
    name: "Apple",
    type: "Stock",
    ltv: "65%",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    type: "Stock",
    ltv: "65%",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    type: "Stock",
    ltv: "65%",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    type: "Stock",
    ltv: "65%",
  },
  {
    symbol: "SPY",
    name: "S&P 500 ETF",
    type: "ETF",
    ltv: "65%",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    type: "Stock",
    ltv: "65%",
  },
];

export default function SupportedAssets() {
  return (
    <section className="border-t border-ink/10 bg-secondary py-24 md:py-32">
      <div className="mx-auto wrap px-6">
        {/* Header */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink/40">
              Supported Assets
            </div>

            <h2 className="font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl lg:text-[2.75rem]">
              Put your assets to work.
            </h2>

            <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-ink/55">
              Deposit eligible assets as collateral and access USDG credit
              based on each asset&apos;s defined risk parameters.
            </p>
          </div>

          <a
            href="/assets"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-ink"
          >
            View all assets
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Asset table */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-ink/10 bg-background">
          {/* Table header */}
          <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_0.8fr_0.8fr] border-b border-ink/10 px-6 py-4 text-[0.68rem] font-medium uppercase tracking-[0.13em] text-ink/35 md:grid md:px-8">
            <div>Asset</div>
            <div>Name</div>
            <div>Type</div>
            <div>LTV</div>
            <div className="text-right">Status</div>
          </div>

          {/* Rows */}
          <div>
            {supportedAssets.map((asset, index) => (
              <div
                key={asset.symbol}
                className={`group px-6 py-5 transition-colors duration-200 hover:bg-ink/[0.025] md:grid md:grid-cols-[1.4fr_1.4fr_1fr_0.8fr_0.8fr] md:items-center md:px-8 ${
                  index < supportedAssets.length - 1
                    ? "border-b border-ink/10"
                    : ""
                }`}
              >
                {/* Asset */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-secondary text-[0.6rem] font-semibold text-ink/60">
                    {asset.symbol.slice(0, 1)}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-ink">
                      {asset.symbol}
                    </div>

                    <div className="mt-0.5 text-xs text-ink/35 md:hidden">
                      {asset.name}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="hidden text-sm text-ink/55 md:block">
                  {asset.name}
                </div>

                {/* Type */}
                <div className="mt-4 text-xs text-ink/40 md:mt-0 md:text-sm">
                  <span className="md:hidden">Type · </span>
                  {asset.type}
                </div>

                {/* LTV */}
                <div className="mt-2 text-sm font-medium text-ink md:mt-0">
                  <span className="mr-2 text-xs font-normal text-ink/35 md:hidden">
                    LTV ·
                  </span>
                  {asset.ltv}
                </div>

                {/* Status */}
                <div className="mt-4 flex items-center justify-between md:mt-0 md:justify-end">
                  <span className="text-xs text-ink/35 md:hidden">
                    Status
                  </span>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-2.5 py-1 text-[0.65rem] font-medium text-ink/55">
                    <CheckIcon className="h-3 w-3" />
                    Active
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-10 flex flex-col gap-5 border-t border-ink/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-ink/45">
            Supported assets can contribute toward one unified collateral
            position and a single USDG credit capacity.
          </p>

          <a
            href="/app"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-ink"
          >
            Start borrowing
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}