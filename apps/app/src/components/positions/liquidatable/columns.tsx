"use client";

import { IPosition } from "@/interfaces/creddit-lens.interface";
import { createColumnHelper } from "@tanstack/react-table";
import { Zap } from "lucide-react";
import { DataTableFeatures } from "../../table/data-table-features";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import {
  ColumnActionButton,
  ColumnHeaderLeft,
  ColumnHeaderRight,
} from "../../table/data-table-column";
import { BlockDate } from "../../ui/block-date";
import { AddressCell } from "../../ui/address-cell";
import { CollateralHoverCard } from "../collateral-hover-card";

const columnHelper = createColumnHelper<DataTableFeatures, IPosition>();

export interface PositionActions {
  onLiquidate?: (position: IPosition) => void;
}

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
      cell: (info) => <AddressCell address={info.getValue()} />,
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
        <ColumnHeaderRight className="text-left">
          Debt Accrued
        </ColumnHeaderRight>
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
