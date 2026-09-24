"use client";

import { ArrowUpRightIcon, ActivityIcon, ArrowDownLeftIcon, ExternalLinkIcon, Clock3Icon } from "lucide-react";

const protocolStats = [
  {
    label: "Total Supplied",
    value: "$12.84M",
    change: "+4.8%",
  },
  {
    label: "USDG Borrowed",
    value: "$7.26M",
    change: "+3.2%",
  },
  {
    label: "Available Liquidity",
    value: "$5.58M",
    change: "43.5%",
  },
  {
    label: "Active Positions",
    value: "1,284",
    change: "+12.6%",
  },
];

const transactions = [
  {
    type: "Borrow",
    address: "0x7F2...91aC",
    asset: "USDG",
    amount: "$8,420",
    time: "2 min ago",
    icon: ArrowDownLeftIcon,
  },
  {
    type: "Deposit",
    address: "0xA41...6D92",
    asset: "NVDA",
    amount: "$24,800",
    time: "4 min ago",
    icon: ArrowUpRightIcon,
  },
  {
    type: "Repay",
    address: "0x92B...4e71",
    asset: "USDG",
    amount: "$3,200",
    time: "7 min ago",
    icon: ArrowUpRightIcon,
  },
  {
    type: "Deposit",
    address: "0xC83...2F10",
    asset: "AAPL",
    amount: "$18,500",
    time: "11 min ago",
    icon: ArrowUpRightIcon,
  },
  {
    type: "Withdraw",
    address: "0x1D4...8B52",
    asset: "TSLA",
    amount: "$9,750",
    time: "14 min ago",
    icon: ArrowDownLeftIcon,
  },
];

export default function ExplorerPreview() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto wrap px-6">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-foreground/40">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-foreground/10">
                <ActivityIcon className="h-3.5 w-3.5" />
              </span>
              Protocol Overview
            </div>

            <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
              See the protocol as it happens.
            </h2>

            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-foreground/55">
              Track deposits, borrowing, repayments, withdrawals, and
              liquidations across the Creddit protocol.
            </p>
          </div>

          <a
            href="/explorer"
            className="group inline-flex items-center gap-2 text-sm font-medium text-foreground transition-opacity hover:opacity-60"
          >
            View Explorer
            <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Stats */}
        <div className="grid bg-secondary overflow-hidden border border-foreground/10 md:grid-cols-2 lg:grid-cols-4">
          {protocolStats.map((stat, index) => (
            <div
              key={stat.label}
              className={`p-6 md:p-7 ${index !== 0 ? "border-t border-foreground/10 md:border-l md:border-t-0" : ""
                }`}
            >
              <div className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-foreground/40">
                {stat.label}
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="font-serif text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                  {stat.value}
                </div>

                <span className="mb-1 text-xs text-foreground/40">
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Activity header */}
        <div className="flex flex-col gap-4 border-b border-x border-ink/10 bg-background px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10">
              <ActivityIcon className="h-4 w-4 text-ink/55" />
            </div>

            <div>
              <div className="text-sm font-medium text-ink">
                Recent activity
              </div>

              <div className="mt-0.5 text-xs text-ink/35">
                Live protocol transactions
              </div>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/10 px-3 py-1.5 text-[0.65rem] font-medium text-ink/50">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Protocol active
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-background border-x border-b">
          {transactions.map((transaction, index) => {
            const Icon = transaction.icon;

            return (
              <div
                key={`${transaction.address}-${transaction.time}`}
                className={`group grid gap-4 px-6 py-5 transition-colors duration-200 hover:bg-ink/[0.02] md:grid-cols-[1.4fr_1.3fr_0.8fr_1fr_0.8fr] md:items-center md:px-8 ${index < transactions.length - 1
                  ? "border-b border-ink/10"
                  : ""
                  }`}
              >
                {/* Transaction type */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-secondary text-ink/50">
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-ink">
                      {transaction.type}
                    </div>

                    <div className="mt-0.5 text-xs text-ink/35">
                      {transaction.address}
                    </div>
                  </div>
                </div>

                {/* Asset */}
                <div className="hidden md:block">
                  <div className="text-xs uppercase tracking-[0.1em] text-ink/30">
                    Asset
                  </div>

                  <div className="mt-1 text-sm text-ink/60">
                    {transaction.asset}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <div className="text-xs uppercase tracking-[0.1em] text-ink/30 md:hidden">
                    Amount
                  </div>

                  <div className="mt-1 text-sm font-medium text-ink md:mt-0">
                    {transaction.amount}
                  </div>
                </div>

                {/* Time */}
                <div className="hidden items-center gap-1.5 text-sm text-ink/40 md:flex">
                  <Clock3Icon className="h-3.5 w-3.5" />
                  {transaction.time}
                </div>

                {/* View */}
                <div className="flex justify-between md:justify-end">
                  <span className="text-xs text-ink/30 md:hidden">
                    {transaction.time}
                  </span>

                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-ink/35 transition-colors hover:border-ink/20 hover:text-ink"
                    aria-label={`View ${transaction.type} transaction`}
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}