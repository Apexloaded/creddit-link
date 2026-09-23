import { NavItem } from ".";

import {
  ActivityIcon,
  BookOpenIcon,
  CircleHelpIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  SearchIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
  ZapIcon,
} from "lucide-react";

export const navItems: NavItem[] = [
  {
    name: "Borrow",
    href: "/borrow",
    children: {
      contents: [
        {
          title: "Borrow USDG",
          description:
            "Use your supported assets as unified collateral and borrow USDG.",
          href: "/borrow",
          icon: CreditCardIcon,
        },
        {
          title: "Credit Line",
          description:
            "Access and manage your revolving Creddit credit line.",
          href: "/credit-line",
          icon: WalletCardsIcon,
        },
      ]
    },
  },
  {
    name: "Explorer",
    href: "/explorer",
    children: {
      contents: [
        {
          title: "Creddit Explorer",
          description:
            "Explore transactions, positions, assets and protocol activity.",
          href: "/explorer",
          icon: SearchIcon,
        },
        {
          title: "Liquidations",
          description:
            "Discover live liquidatable positions and participate in liquidations.",
          href: "/explorer/liquidations",
          icon: ZapIcon,
        },
        {
          title: "Transactions",
          description:
            "Track deposits, borrows, repayments, withdrawals and liquidations.",
          href: "/explorer/transactions",
          icon: ActivityIcon,
        },
      ],
      menus: [
        {
          title: "EXPLORE",
          items: [
            { name: "Overview", href: "/explorer" },
            { name: "Transactions", href: "/explorer/transactions" },
            { name: "Positions", href: "/explorer/positions" },
            { name: "Liquidations", href: "/explorer/liquidations" },
            { name: "Assets", href: "/explorer/assets" },
          ],
        },
      ],
    },
  },
  {
    name: "Markets",
    href: "/markets",
    children: {
      menus: [
        {
          title: "MARKETS",
          items: [
            { name: "All Assets", href: "/markets" },
            { name: "Market Activity", href: "/markets/activity" },
            { name: "Risk Parameters", href: "/markets/risk" },
          ],
        },
      ],
    },
  },
  {
    name: "How It Works",
    href: "/how-it-works",
    children: {
      contents: [
        {
          title: "How Creddit Works",
          description:
            "Learn how unified collateral becomes flexible borrowing power.",
          href: "/how-it-works",
          icon: BookOpenIcon,
        },
        {
          title: "Risk & Liquidations",
          description:
            "Understand collateral factors, health and the liquidation process.",
          href: "/how-it-works/risk",
          icon: ShieldCheckIcon,
        },
      ],
      menus: [
        {
          title: "HOW IT WORKS",
          items: [
            { name: "How Creddit Works", href: "/how-it-works" },
            { name: "Borrowing", href: "/how-it-works#borrowing" },
            { name: "Collateral", href: "/how-it-works#collateral" },
            { name: "Risk", href: "/how-it-works#risk" },
            { name: "Liquidations", href: "/how-it-works#liquidations" },
          ],
        },
      ],
    },
  },
  {
    name: "Resources",
    href: "/resources",
    children: {
      contents: [
        {
          title: "Documentation",
          description:
            "Read the Creddit protocol documentation and developer guides.",
          href: "/docs",
          icon: BookOpenIcon,
        },
        {
          title: "Help Center",
          description:
            "Find answers and guidance for using Creddit.",
          href: "/help",
          icon: CircleHelpIcon,
        },
      ],
      menus: [
        {
          title: "LEARN",
          items: [
            { name: "Documentation", href: "/docs" },
            { name: "Guides", href: "/docs/guides" },
            { name: "FAQs", href: "/help/faqs" },
            { name: "Glossary", href: "/docs/glossary" },
          ],
        },
        {
          title: "DEVELOPERS",
          items: [
            { name: "Developer Docs", href: "/docs/developers" },
            { name: "Contracts", href: "/docs/contracts" },
            { name: "API / SDK", href: "/docs/sdk" },
          ],
        },
      ],
    },
  },
] as const;
