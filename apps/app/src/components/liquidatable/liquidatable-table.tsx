"use client";

import { Fragment, memo, useCallback, useState } from "react";
import { baseTableConfig, DataTable } from "../table/data-table";
import { getLiquidatableColumns } from "./columns";
import { useMemo } from "react";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/route";
import EmptyState from "../ui/empty-state";
import { Button } from "../ui/button";
import { useAppDispatch, useCredditLine } from "@/hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Loader2 } from "lucide-react";
import LiquidateModal from "./liquidate-modal";

type PositionTableProps = {
  data: IPosition[];
};

function LiquidatableTableComponent({ data }: PositionTableProps) {
  const router = useRouter();
  const [liquidatePosition, setLiquidatePosition] = useState<IPosition | null>(
    null,
  );

  const columns = useMemo(
    () =>
      getLiquidatableColumns({
        onLiquidate: (p) => setLiquidatePosition(p),
      }),
    [],
  );

  const config = useMemo(
    () => ({
      ...baseTableConfig,
      enableRowSelection: false,
      isSticky: true,
    }),
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
            description="There are no liquidatable positions on Creddit Link, kindly check back later."
          />
        }
      />

      <LiquidateModal
        position={liquidatePosition}
        open={!!liquidatePosition}
        onClose={() => setLiquidatePosition(null)}
        positions={data}
      />
    </Fragment>
  );
}

export const LiquidatableTable = memo(LiquidatableTableComponent) as (
  props: PositionTableProps,
) => React.ReactNode;
