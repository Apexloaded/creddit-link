"use client";

import {
  ReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type DataTableFeatures } from "./data-table-features";
import { memo, ReactNode } from "react";
import EmptyState from "../ui/empty-state";

interface ViewTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  table: ReactTable<DataTableFeatures, TData>;
  emptyState?: ReactNode;
}

function ViewTableComponent<TData extends RowData>({
  columns,
  table,
  emptyState,
}: ViewTableProps<TData>) {
  const emptyRow = (
    <TableRow>
      <TableCell colSpan={columns.length} className="h-96 text-center">
        {emptyState ?? <EmptyState title="No Data Found" />}
      </TableCell>
    </TableRow>
  );

  return (
    <Table>
      {table.getRowModel().rows?.length > 0 && (
        <TableHeader className="bg-secondary">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
      )}
      <TableBody>
        {table.getRowModel().rows?.length
          ? table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : emptyRow}
      </TableBody>
    </Table>
  );
}

export const ViewTable = memo(ViewTableComponent) as <TData extends RowData>(
  props: ViewTableProps<TData>,
) => React.ReactNode;
