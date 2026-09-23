"use client";

import { envConfig } from "@/config";
import Link from "next/link";
import { useState } from "react";

export function Footer() {
  const [year] = useState(new Date().getFullYear());
  const footerLinks: {
    title: string;
    children: { name: string; href: string; target?: string }[];
  }[] = [
      {
        title: "EXPLORE",
        children: [
          { name: "Supported Assets", href: "/assets" },
          { name: "Explorer", href: "/explorer" },
          { name: "Liquidations", href: "/explorer/liquidations" },
          { name: "Markets", href: "/markets" },
        ],
      },

      {
        title: "RESOURCES",
        children: [
          { name: "How It Works", href: "/how-it-works" },
          { name: "Documentation", href: "/docs" },
          { name: "FAQ", href: "/faq" },
          { name: "Support", href: "/support" },
        ],
      },
      {
        title: "PROTOCOL",
        children: [
          { name: "USDG", href: "/usdg" },
          { name: "Risk & Safety", href: "/risk" },
          { name: "Smart Contracts", href: "/contracts" },
          {
            name: "GitHub",
            href: "https://github.com/credditlink",
            target: "_blank",
          },
        ],
      },
      {
        title: "COMPANY",
        children: [
          { name: "About", href: "/about" },
          { name: "Blog", href: "/blog" },
          { name: "Contact", href: "/contact" },
        ],
      },
    ];
  return (
    <footer className="border-t border-line bg-foreground pt-16 pb-10">
      <div className="wrap">
        <div className="flex justify-between gap-16 flex-wrap pb-14">
          <div className="md:max-w-[280px]">
            <div className="font-serif text-background text-[1.3rem] font-medium mb-4">
              {envConfig.app.name}
            </div>
            <p className="text-[0.88rem] text-background/55 leading-relaxed">
              Flexible credit backed by your assets. Borrow USDG without selling your
              positions.
            </p>
          </div>

          <div className="flex gap-16 flex-wrap">
            {footerLinks.map((group, index) => (
              <div key={group.title || index}>
                <h5 className="text-[0.78rem] text-background font-semibold mb-4.5 uppercase tracking-widest">
                  {group.title}
                </h5>
                <div className="space-y-3 text-background">
                  {group.children.map((link, linkIndex) => (
                    <Link
                      key={link.href || linkIndex}
                      href={link.href}
                      className="block text-[0.9rem] opacity-75 hover:opacity-100 transition-opacity"
                      target={link?.target || "_self"}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-line text-[0.78rem] text-background flex-wrap gap-4">
          <p>&copy; {year} {envConfig.app.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="hover:opacity-100 opacity-75 transition-colors"
            >
              Twitter
            </Link>
            <Link
              href="#"
              className="hover:opacity-100 opacity-75 transition-colors"
            >
              LinkedIn
            </Link>
            <Link
              href="#"
              className="hover:opacity-100 opacity-75 transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
