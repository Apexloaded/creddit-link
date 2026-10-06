"use client";

import { IPosition } from "@/interfaces/creddit-lens.interface";
import { createColumnHelper } from "@tanstack/react-table";
import {
  CircleXIcon,
  DropletIcon,
  EllipsisIcon,
  PlusCircleIcon,
  SquareMinusIcon,
  Zap,
} from "lucide-react";
import { DataTableFeatures } from "../table/data-table-features";
import { formatCurrency } from "@/lib/utils";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AddressCell } from "../ui/address-cell";
import { CollateralHoverCard } from "./collateral-hover-card";

const columnHelper = createColumnHelper<DataTableFeatures, IPosition>();

export interface PositionActions {
  onDeposit?: (position: IPosition) => void;
  onRepay?: (position: IPosition) => void;
  onWithdraw?: (position: IPosition) => void;
  onLiquidate?: (position: IPosition) => void;
  onClose?: (position: IPosition) => void;
}

export function getPositionColumns(actions: PositionActions = {}) {
  const hasActions = Boolean(
    actions.onDeposit || actions.onRepay || actions.onLiquidate,
  );

  return columnHelper.columns([
    columnHelper.accessor("id", {
      id: "id",
      header: () => <ColumnHeaderLeft>Position</ColumnHeaderLeft>,
      cell: (info) => {
        const isLiquidatable = info.row.original.isLiquidatable;
        const isClosed = info.row.original.isClosed;
        return (
          <div className="flex items-center gap-3 w-40">
            <span className="font-mono text-sm font-semibold text-foreground">
              <span className="text-foreground/30">#</span>
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
                  <span className="inline-flex items-center animate-pulse gap-1.5 rounded-full bg-success/10 p-1 text-xs font-semibold text-success ring-1 ring-inset ring-success/30">
                    <span className="h-2 w-2 rounded-full bg-success" />
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
      cell: (info) => {
        const date = info.getValue();
        return <div>{date ? <BlockDate date={date} /> : "--"}</div>;
      },
    }),

    columnHelper.accessor("closedAt", {
      header: "Closed At",
      cell: (info) => {
        const date = info.getValue();
        return (
          <div>
            {date ? (
              <BlockDate date={date} />
            ) : (
              <p className="text-foreground/60">--</p>
            )}
          </div>
        );
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
        <ColumnHeaderRight className="text-left">Interest</ColumnHeaderRight>
      ),
      cell: (info) => {
        const debt = parseFloat(info.getValue().formatted ?? "0");
        const borrowed = parseFloat(
          info.row.original.cumulativeBorrowed?.formatted ?? "0",
        );
        const repaid = parseFloat(
          info.row.original.cumulativeRepaid?.formatted ?? "0",
        );

        // Total Paid + Outstanding Debt minus Total Principal Borrowed
        const interest = Math.max(0, debt + repaid - borrowed);

        return (
          <div className="text-left font-medium tabular-nums text-success">
            {interest > 0
              ? `+${formatCurrency(interest.toFixed(2))}`
              : formatCurrency("0.00")}
          </div>
        );
      },
    }),

    columnHelper.accessor("collateralUsd", {
      header: () => (
        <ColumnHeaderRight className="text-center">
          Collateral (USD)
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
        const isInfinite = info.row.original.isInfiniteHealth;
        const isClosed = info.row.original.isClosed;

        if (isClosed) {
          return (
            <div className="flex justify-center">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold">
                --
              </span>
            </div>
          );
        }
        if (isInfinite) {
          return (
            <div className="flex justify-center">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                ∞
              </span>
            </div>
          );
        }

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
            <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full ${tone.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
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
              const isInfinite = row.original.isInfiniteHealth;
              const isClosed = row.original.isClosed;

              return (
                <div className={"flex items-center justify-end gap-1"}>
                  {actions.onDeposit && !isClosed && (
                    <ColumnActionButton
                      label="Add fund"
                      icon={PlusCircleIcon}
                      onClick={() => actions.onDeposit!(position)}
                    />
                  )}
                  {actions.onLiquidate && position.isLiquidatable && (
                    <ColumnActionButton
                      label="Liquidate"
                      icon={Zap}
                      tone="danger"
                      onClick={() => actions.onLiquidate!(position)}
                    />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <ColumnActionButton
                        label="More actions"
                        icon={EllipsisIcon}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className={"bg-background w-auto"}
                      align={"end"}
                      side={"bottom"}
                    >
                      <DropdownMenuGroup>
                        {actions.onRepay && (
                          <DropdownMenuItem
                            disabled={isInfinite}
                            onClick={() => actions.onRepay!(position)}
                            className={"focus:bg-secondary"}
                          >
                            <DropletIcon /> Repay credit
                          </DropdownMenuItem>
                        )}
                        {actions.onWithdraw && (
                          <DropdownMenuItem
                            disabled={isClosed}
                            onClick={() => actions.onWithdraw!(position)}
                            className={"focus:bg-secondary"}
                          >
                            <SquareMinusIcon /> Withdraw collateral
                          </DropdownMenuItem>
                        )}
                        {actions.onLiquidate && position.isLiquidatable && (
                          <DropdownMenuItem
                            disabled={isInfinite}
                            className={"focus:bg-secondary"}
                          >
                            <Zap />
                            Liquidate position
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        {actions.onClose && (
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isClosed}
                            onClick={() => actions.onClose!(position)}
                          >
                            <CircleXIcon className="h-4 w-4" />
                            Close position
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            },
          }),
        ]
      : []),
  ]);
}
