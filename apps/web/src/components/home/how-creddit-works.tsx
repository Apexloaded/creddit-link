"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  Layers3Icon,
  WalletCardsIcon,
  ZapIcon,
} from "lucide-react";
import { CreditCapacityDiagram } from "./credit-captial-diagram";

const steps = [
  {
    number: "01",
    title: "Bring your assets",
    description:
      "Deposit supported assets into Creddit and use them as collateral without giving up your market exposure.",
    icon: WalletCardsIcon,
  },
  {
    number: "02",
    title: "Build your credit",
    description:
      "Creddit combines your eligible assets into unified collateral, creating one flexible credit capacity.",
    icon: Layers3Icon,
  },
  {
    number: "03",
    title: "Borrow USDG",
    description:
      "Access the liquidity you need in USDG while keeping your underlying assets working for you.",
    icon: ZapIcon,
  },
];

const collateralAssets = ["AAPL", "NVDA", "TSLA"];

export default function HowCredditWorks() {
  return (
    <section className="relative bg-secondary pt-24 pb-10 md:pt-32 md:pb-24">
      <div className="absolute inset-0 text-primary opacity-[0.15] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:70px_70px]" />
      <div className="mx-auto wrap px-6">
        {/* Header */}
        <div className="max-w-2xl">
          <div className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-foreground/40">
            How Creddit Works
          </div>

          <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
            Turn your assets into flexible credit.
          </h2>

          <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-foreground/55">
            Creddit brings your supported assets together as unified
            collateral, giving you access to USDG without requiring you to
            sell your positions.
          </p>
        </div>

        {/* Flow */}
        <div className="mt-16 grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="group relative overflow-hidden rounded-2xl border border-foreground/10 bg-background p-7 transition-colors duration-300 hover:bg-secondary md:p-8"
              >
                {/* Step number */}
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-medium tracking-[0.14em] text-foreground/35">
                    {step.number}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 text-foreground/60 transition-colors group-hover:border-foreground/20 group-hover:text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-14">
                  <h3 className="font-serif text-2xl font-medium tracking-tight text-foreground">
                    {step.title}
                  </h3>

                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/50">
                    {step.description}
                  </p>
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-background lg:flex">
                    <ArrowRightIcon className="h-3 w-3 text-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unified collateral visual */}
        <div className="mt-4">
          <CreditCapacityDiagram />
        </div>
      </div>
    </section>
  );
}