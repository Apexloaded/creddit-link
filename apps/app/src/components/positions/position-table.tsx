import { memo, useCallback } from "react";
import { baseTableConfig, DataTable } from "../table/data-table";
import { getPositionColumns } from "./columns";
import { useMemo } from "react";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/route";
import EmptyState from "../ui/empty-state";
import { Button } from "../ui/button";

type PositionTableProps = {
  data: IPosition[];
};

function PositionTableComponent({ data }: PositionTableProps) {
  const router = useRouter();

  const columns = useMemo(
    () =>
      getPositionColumns({
        onDeposit: (p) => onDeposit(p.id.toString()),
        onRepay: (p) => {},
        onLiquidate: (p) => {},
      }),
    [router],
  );

  const config = useMemo(
    () => ({
      ...baseTableConfig,
      enableRowSelection: false,
    }),
    [],
  );

  const onDeposit = useCallback(
    (id?: string) => {
      router.push(routes.app.deposit(id));
    },
    [router],
  );

  return (
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
          <Button onClick={() => onDeposit()}>Open Postion</Button>
        </EmptyState>
      }
      // batchActions={actions}
      // search={searchElement}
      // emptyState={EMPTY_STATE}
    />
  );
}

export const PositionTable = memo(PositionTableComponent) as (
  props: PositionTableProps,
) => React.ReactNode;
