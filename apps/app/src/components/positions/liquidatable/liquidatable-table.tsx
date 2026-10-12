"use client";

import { Fragment, memo, useState } from "react";
import {
  baseTableConfig,
  DataTable,
  DataTableConfig,
} from "../../table/data-table";
import { getLiquidatableColumns } from "./columns";
import { useMemo } from "react";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useRouter } from "next/navigation";
import EmptyState from "../../ui/empty-state";
import LiquidateModal from "./liquidate-modal";

type PositionTableProps = {
  data: IPosition[];
  enableSearch?: boolean;
  enableColumnVisibility?: boolean;
};

function LiquidatableTableComponent({
  data,
  enableColumnVisibility,
  enableSearch,
}: PositionTableProps) {
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
    () =>
      ({
        ...baseTableConfig,
        enableColumnVisibility,
        enableSearch,
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
