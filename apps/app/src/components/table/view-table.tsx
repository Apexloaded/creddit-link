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
import { cn } from "@/lib/utils";

interface ViewTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  table: ReactTable<DataTableFeatures, TData>;
  emptyState?: ReactNode;
  isSticky?: boolean;
}

function ViewTableComponent<TData extends RowData>({
  columns,
  table,
  emptyState,
  isSticky = false,
}: ViewTableProps<TData>) {
  const emptyRow = (
    <TableRow>
      <TableCell colSpan={columns.length} className="h-96 text-center">
        {emptyState ?? <EmptyState title="No Data Found" />}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="relative w-full overflow-x-auto">
      <Table>
        {table.getRowModel().rows?.length > 0 && (
          <TableHeader className="bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  const totalHeaders = headerGroup.headers.length;
                  const isFirstColumn = isSticky && index === 0;
                  const isLastColumn = isSticky && index === totalHeaders - 1;

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        isFirstColumn &&
                          "sticky left-0 pl-8 z-20 bg-secondary shadow-[3px_0_8px_-2px_rgba(0,0,0,0.15)] dark:shadow-[3px_0_8px_-2px_rgba(0,0,0,0.4)]",
                        isLastColumn &&
                          "sticky right-0 z-20 bg-gradient-to-r from-transparent via-secondary/90 to-secondary pl-10 pr-8 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.15)] dark:shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.4)]",
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
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
                  className="group"
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const totalCells = row.getVisibleCells().length;
                    const isFirstColumn = isSticky && index === 0;
                    const isLastColumn = isSticky && index === totalCells - 1;

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          // First column sticky + shadow
                          isFirstColumn &&
                            "sticky left-0 pl-8 z-10 bg-background group-hover:bg-muted-light group-has-[[data-state=open]]:bg-muted-light group-has-[[aria-expanded=true]]:bg-muted-light group-data-[state=selected]:bg-muted-light transition-colors duration-150 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.15)] dark:shadow-[3px_0_8px_-2px_rgba(0,0,0,0.4)]",
                          // Last column sticky gradient + strong left shadow
                          isLastColumn &&
                            "sticky right-0 z-10 pl-8 pr-8 bg-gradient-to-r from-transparent via-background/80 to-background group-hover:via-muted/80 group-hover:to-muted group-has-[[data-state=open]]:via-muted/80 group-has-[[data-state=open]]:to-muted group-has-[[aria-expanded=true]]:via-muted/80 group-has-[[aria-expanded=true]]:to-muted group-data-[state=selected]:via-muted/80 group-data-[state=selected]:to-muted transition-colors duration-150 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.15)] dark:shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.4)]",
                        )}
                      >
                        {isLastColumn ? (
                          <div
                            className={cn(
                              "opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex justify-end",
                              // Keep visible if row or trigger has an open state/menu
                              "group-has-[[data-state=open]]:opacity-100 group-has-[[aria-expanded=true]]:opacity-100 has-[[data-state=open]]:opacity-100 has-[[aria-expanded=true]]:opacity-100",
                            )}
                          >
                            <table.FlexRender cell={cell} />
                          </div>
                        ) : (
                          <table.FlexRender cell={cell} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            : emptyRow}
        </TableBody>
      </Table>
    </div>
  );
}

export const ViewTable = memo(ViewTableComponent) as <TData extends RowData>(
  props: ViewTableProps<TData>,
) => React.ReactNode;
