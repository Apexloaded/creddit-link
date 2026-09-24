"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import CredditSimulator from "./creddit-simulator";
import AssetTicker from "./asset-ticker";

const stockSupported = [
  {
    items: [
      {
        icon: "",
        id: "NVDA",
        price: "789.79",
        ltv: "38.8"
      },
      {
        id: "AAPL",
        price: "339.58",
        ltv: "10.2"
      },
      {
        id: "MSFT",
        price: "500.36",
        ltv: "12"
      },
      {
        id: "TSLA",
        price: "378.50",
        ltv: "60.58"
      },
      {
        id: "SPY",
        price: "775.99",
        ltv: "77"
      },
      {
        id: "AI",
        price: "0.55",
        ltv: "38.14"
      }
    ],
  }
];

function HomeHero() {
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const header = headerRef.current;
      const bar = barRef.current;
      if (!header || !bar) return;

      const headerBottom = header.getBoundingClientRect().bottom;
      const barHeight = bar.offsetHeight;

      // Switch from fixed to sticky once the header bottom
      // is close enough that sticky takes over naturally
      if (headerBottom <= window.innerHeight) {
        bar.style.position = "sticky";
        bar.style.bottom = "0";
        bar.style.top = "";
      } else {
        bar.style.position = "fixed";
        bar.style.bottom = "0";
        bar.style.left = "0";
        bar.style.right = "0";
      }
    };

    handleScroll(); // run on mount
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="relative flex flex-col min-h-dvh h-auto pt-32 ">
      <div
        className="absolute inset-0 border-b border-line bg-secondary pointer-events-none"
        style={{ top: 0, height: "118vh" }}
      />
      <div className="relative px-5 z-10 max-w-200 mx-auto">
        <h1
          className="font-heading text-center text-[clamp(2.6rem,5.5vw,4.2rem)] font-normal leading-[0.98] tracking-[-0.022em] opacity-0"
          style={{
            animation: "rise 1s cubic-bezier(0.22,1,0.36,1) forwards 0.35s",
            fontOpticalSizing: "auto",
          }}
        >
          Turn your assets into flexible credit{" "}
          <span className="text-primary">without</span> selling{" "}
          <span className="text-primary">them</span>.
        </h1>

        <p
          className="mt-8 max-w-140 text-center mx-auto text-[1.18rem] leading-[1.55] text-foreground/68 font-normal opacity-0"
          style={{ animation: "rise 0.9s ease forwards 0.6s" }}
        >
          <span className="font-medium">Creddit Link</span> lets you borrow{" "}
          <span className="font-medium">USDG</span> against multiple assets as unified collateral giving you liquidity without forcing you to sell your positions.
        </p>

        <div
          className="mt-11 flex items-center justify-center gap-7 opacity-0 flex-wrap"
          style={{ animation: "rise 0.9s ease forwards 0.78s" }}
        >
          <Link
            href="#demo"
            className="link-btn flex-nowrap"
          >
            Get Started
            <ArrowRightIcon className="size-5 ml-1" />
          </Link>
          <Link href="#platform" className="border-b hover:border-foreground">
            Explore Protocol
          </Link>
        </div>
      </div>
      <div
        className="max-w-230 px-5 w-full relative z-10 mb-14 mt-20 mx-auto opacity-0"
        style={{ animation: "rise 0.9s ease forwards 0.95s" }}
      >
        <CredditSimulator />
      </div>
      {/* Stock Supported */}
      <AssetTicker items={stockSupported.flatMap((group) => group.items)} />
    </header>
  );
}

export default HomeHero;
