"use client";

import { Fragment, memo, useCallback, useState } from "react";
import {
  baseTableConfig,
  DataTable,
  DataTableConfig,
} from "../table/data-table";
import { getPositionColumns } from "./columns";
import { useMemo } from "react";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/route";
import EmptyState from "../ui/empty-state";
import { Button } from "../ui/button";
import { useAppDispatch, useCredditLine } from "@/hooks";
import { setPosition } from "@/slices/position/position.slice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Loader2 } from "lucide-react";

type PositionTableProps = {
  data: IPosition[];
  enableSearch?: boolean;
  enableColumnVisibility?: boolean;
};

function PositionTableComponent({
  data,
  enableColumnVisibility = true,
  enableSearch = true,
}: PositionTableProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [pendingPosition, setPendingPosition] = useState<IPosition | null>(
    null,
  );
  const { useClosePosition } = useCredditLine();
  const { closePosition, isProcessing, stepStatus, error } = useClosePosition(
    pendingPosition?.id?.toString() ?? null,
  );

  const onDeposit = useCallback(
    (position: IPosition) => {
      dispatch(setPosition(position));
      router.push(routes.app.deposit(position.id.toString()));
    },
    [router, dispatch],
  );

  const onWithdraw = useCallback(
    (position: IPosition) => {
      dispatch(setPosition(position));
      router.push(routes.app.withdrawCollateral(position.id.toString()));
    },
    [router, dispatch],
  );

  const onRepay = useCallback(
    (position: IPosition) => {
      dispatch(setPosition(position));
      router.push(routes.app.repay(position.id.toString()));
    },
    [router, dispatch],
  );

  const onClose = useCallback(
    async (position: IPosition) => {
      try {
        await closePosition(position.id.toString());
        setPendingPosition(null); // Close modal on success
      } catch (err) {
        console.error("Failed to close position:", err);
        // Keep modal open so user can inspect error or retry
      }
    },
    [router, dispatch, closePosition],
  );

  const columns = useMemo(
    () =>
      getPositionColumns({
        onDeposit,
        onRepay,
        onWithdraw,
        onLiquidate: (p) => {},
        onClose: setPendingPosition,
      }),
    [router],
  );

  const config = useMemo(
    () =>
      ({
        ...baseTableConfig,
        enableColumnVisibility,
        enableSearch,
        searchPlaceholder: "Search positions...",
        enableRowSelection: false,
        isSticky: true,
      }) as DataTableConfig<IPosition>,
    [],
  );

  return (
    <Fragment>
      <DataTable
        data={data}
        columns={columns}
        config={config}
        emptyState={
          <EmptyState
            className=""
            title="No Position Found"
            description="Click the button below to open your first position and draw your first Creddit line."
          >
            <Button onClick={() => router.push(routes.app.deposit())}>
              Open Postion
            </Button>
          </EmptyState>
        }
      />
      <AlertDialog
        open={!!pendingPosition}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            setPendingPosition(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Close Position #{pendingPosition?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this position? This will resolve
              all open debt and return remaining collateral.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              {error.message || "An unexpected error occurred."}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessing}
              onClick={(e) => {
                e.preventDefault();
                onClose(pendingPosition!);
              }}
            >
              {isProcessing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {stepStatus === "approving"
                ? "Approving USDG..."
                : stepStatus === "closing"
                  ? "Closing Position..."
                  : "Confirm & Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  );
}

export const PositionTable = memo(PositionTableComponent) as (
  props: PositionTableProps,
) => React.ReactNode;
