"use client";

import { useState } from "react";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Check,
  CircleXIcon,
  Copy,
  DropletIcon,
  EllipsisIcon,
  HandCoinsIcon,
  LayersArrowUpIcon,
  PlusCircleIcon,
  SquareMinusIcon,
  Zap,
} from "lucide-react";
import { DataTableFeatures } from "../table/data-table-features";
import {
  addressGradient,
  cn,
  formatCurrency,
  toFormattedAmount,
  truncate,
} from "@/lib/utils";
import { Stock, TOKEN_DECIMALS, toRhLogo } from "@/config";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  ColumnActionButton,
  ColumnHeaderLeft,
  ColumnHeaderRight,
} from "../table/data-table-column";
import { BlockDate } from "../ui/block-date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import useClipboard from "@/hooks/use-clipboard";

const columnHelper = createColumnHelper<DataTableFeatures, IPosition>();

export interface PositionActions {
  onLiquidate?: (position: IPosition) => void;
}

/* ----------------------------- helpers ----------------------------- */

function TokenLogo({
  symbol,
  size = 20,
  className = "",
}: {
  symbol: Stock;
  size?: number;
  className?: string;
}) {
  console.log("TOKEN SYMBOL :: :: ", symbol);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toRhLogo(symbol)}
      alt={symbol}
      title={symbol}
      width={size}
      height={size}
      className={`rounded-full bg-white object-cover ring-2 ring-white dark:ring-slate-900 ${className}`}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function AddressCell({ addr }: { addr: string }) {
  const { copy, isCopied } = useClipboard();

  return (
    <div className="group flex items-center gap-2">
      <span
        className="h-6 w-6 shrink-0 rounded-full"
        style={{ background: addressGradient(addr) }}
      />
      <span
        className="font-mono text-xs text-slate-700 dark:text-slate-300"
        title={addr}
      >
        {truncate(addr)}
      </span>
      <button
        onClick={() => copy(addr)}
        aria-label="Copy address"
        className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-800"
      >
        {isCopied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

const MAX_ICONS = 3;

function CollateralHoverCard({ position }: { position: IPosition }) {
  const { collaterals, collateralUsd } = position;
  const visible = collaterals.slice(0, MAX_ICONS);
  const extra = collaterals.length - visible.length;

  return (
    <HoverCard>
      <HoverCardTrigger delay={100} closeDelay={80}>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View ${collaterals.length} collateral assets`}
          className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div className="flex -space-x-2">
            {visible.map((cl, i) => (
              <TokenLogo
                key={`${cl.symbol}-${i}`}
                symbol={cl.symbol}
                size={24}
              />
            ))}
          </div>
          {extra > 0 && (
            <span className="ml-1.5 text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
              +{extra}
            </span>
          )}
        </button>
      </HoverCardTrigger>

      <HoverCardContent align="start" sideOffset={8} className="w-72 p-0">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Collateral
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Position #{position.id}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {collaterals.length} {collaterals.length === 1 ? "asset" : "assets"}
          </span>
        </div>

        {/* asset list */}
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {collaterals.map((c, i) => (
            <li
              key={`${c.symbol}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <TokenLogo symbol={c.symbol} size={28} className="ring-0" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {c.symbol}
                </span>
              </div>
              <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300">
                {formatCurrency(c.value.formatted, false)}
              </span>
            </li>
          ))}
        </ul>

        {/* footer total */}
        <div className="flex items-center justify-between rounded-b-md border-t border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total value
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(collateralUsd.formatted)}
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/* ----------------------------- columns ----------------------------- */

export function getLiquidatableColumns(actions: PositionActions = {}) {
  const hasActions = Boolean(actions.onLiquidate);

  return columnHelper.columns([
    columnHelper.accessor("id", {
      id: "id",
      header: () => <ColumnHeaderLeft>Position</ColumnHeaderLeft>,
      cell: (info) => {
        const isLiquidatable = info.row.original.isLiquidatable;
        const isClosed = info.row.original.isClosed;
        return (
          <div className="flex items-center gap-3 w-40">
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
              <span className="text-slate-400">#</span>
              {info.getValue()}
            </span>
            <Tooltip>
              <TooltipTrigger>
                {isLiquidatable ? (
                  <span className="inline-flex justify-center items-center gap-1.5 rounded-full bg-destructive/10 size-4 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/40">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                    </span>
                  </span>
                ) : isClosed ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex justify-center items-center gap-1.5 rounded-full bg-line/10 size-4 text-xs font-semibold text-destructive ring-1 ring-inset ring-line/40">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-line" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-line" />
                      </span>
                    </span>
                    <p className="flex-1">Closed</p>
                  </div>
                ) : (
                  <span className="inline-flex items-center animate-pulse gap-1.5 rounded-full bg-emerald-50 p-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className={"w-auto"}>
                {isLiquidatable
                  ? "Position is at risk of liquidation"
                  : isClosed
                    ? "Position is closed"
                    : "Position is healthy"}
              </TooltipContent>
            </Tooltip>

            <CollateralHoverCard position={info.row.original} />
          </div>
        );
      },
    }),

    columnHelper.accessor("owner", {
      header: "Owner",
      cell: (info) => <AddressCell addr={info.getValue()} />,
    }),

    columnHelper.accessor("openedAt", {
      header: "Opened At",
      enableSorting: true,
      cell: (info) => {
        const date = info.getValue();
        return <div>{date ? <BlockDate date={date} /> : "--"}</div>;
      },
    }),

    columnHelper.accessor("cumulativeBorrowed", {
      header: () => (
        <ColumnHeaderRight className="text-left">
          Credits Issued
        </ColumnHeaderRight>
      ),
      cell: (info) => (
        <div className="text-left font-medium tabular-nums text-slate-900 dark:text-slate-100">
          {formatCurrency(info.getValue().formatted)}
        </div>
      ),
    }),

    columnHelper.accessor("debt", {
      header: () => (
        <ColumnHeaderRight className="text-left">Debt Accrued</ColumnHeaderRight>
      ),
      cell: (info) => {
        const debt = parseFloat(info.getValue().formatted ?? "0");
        return (
          <div className="text-left font-medium tabular-nums text-destructive">
            {debt > 0
              ? `${formatCurrency(debt.toFixed(2))}`
              : formatCurrency("0.00")}
          </div>
        );
      },
    }),

    columnHelper.accessor("collateralUsd", {
      header: () => (
        <ColumnHeaderRight className="text-center">
          Total Collateral
        </ColumnHeaderRight>
      ),
      cell: (info) => (
        <div className="text-center font-medium tabular-nums text-slate-900 dark:text-slate-100">
          {formatCurrency(info.getValue().formatted)}
        </div>
      ),
    }),

    columnHelper.accessor("healthFactor", {
      header: () => (
        <ColumnHeaderRight className="text-center">
          Health Factor
        </ColumnHeaderRight>
      ),
      cell: (info) => {
        const val = parseFloat(info.getValue().formatted);
        const tone =
          val > 1.5
            ? {
              text: "text-emerald-700 dark:text-emerald-400",
              bar: "bg-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-500/10",
            }
            : val > 1.1
              ? {
                text: "text-amber-700 dark:text-amber-400",
                bar: "bg-amber-500",
                bg: "bg-amber-50 dark:bg-amber-500/10",
              }
              : {
                text: "text-red-700 dark:text-red-400",
                bar: "bg-red-500",
                bg: "bg-red-50 dark:bg-red-500/10",
              };

        // gauge: 1.0x = 0%, 3.0x+ = 100%
        const pct = Math.max(0, Math.min(100, ((val - 1) / 2) * 100));

        return (
          <div className="flex flex-col items-center gap-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${tone.bg} ${tone.text}`}
            >
              {Number.isFinite(val) ? `${val.toFixed(2)}x` : "—"}
            </span>
          </div>
        );
      },
    }),

    ...(hasActions
      ? [
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          enableSorting: false,

          cell: ({ row }) => {
            const position = row.original;
            return (
              <div className={"flex items-center justify-end gap-1"}>
                {actions.onLiquidate && position.isLiquidatable && (
                  <ColumnActionButton
                    label="Liquidate"
                    icon={Zap}
                    tone="success"
                    onClick={() => actions.onLiquidate!(position)}
                  />
                )}
              </div>
            );
          },
        }),
      ]
      : []),
  ]);
}
