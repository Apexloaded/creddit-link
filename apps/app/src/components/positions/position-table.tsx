"use client";

import { memo, useCallback } from "react";
import { baseTableConfig, DataTable } from "../table/data-table";
import { getPositionColumns } from "./columns";
import { useMemo } from "react";
import { IPosition } from "@/interfaces/creddit-lens.interface";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/route";
import EmptyState from "../ui/empty-state";
import { Button } from "../ui/button";
import { useAppDispatch } from "@/hooks";
import { setPosition } from "@/slices/position/position.slice";

type PositionTableProps = {
  data: IPosition[];
};

function PositionTableComponent({ data }: PositionTableProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const onDeposit = useCallback(
    (position: IPosition) => {
      dispatch(setPosition(position));
      router.push(routes.app.deposit(position.id.toString()));
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

  const columns = useMemo(
    () =>
      getPositionColumns({
        onDeposit,
        onRepay,
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
          <Button onClick={() => router.push(routes.app.deposit())}>
            Open Postion
          </Button>
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
