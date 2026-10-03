"use client";

import {
  ColumnFiltersState,
  ColumnVisibilityState,
  SortingState,
  Updater,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { features, type DataTableFeatures } from "./data-table-features";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ViewTable } from "./view-table";
import TableSkeleton from "./table-skeleton";

export const baseTableConfig = {
  enableDragAndDrop: false,
  enableRowSelection: true,
  enableColumnVisibility: true,
  enablePagination: true,
  serverSide: true,
} as const;

export interface DataTableConfig<T> {
  enableDragAndDrop?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  pageIndex?: number;
  pageCount?: number;
  pageSizeOptions?: number[];
  onSortChange?: (columnId: keyof T, sortOrder: "asc" | "desc") => void;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  isServerSide?: boolean;
  isSticky?: boolean; // Optional prop to enable/disable sticky first column
}

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  isLoading?: boolean;
  config: DataTableConfig<TData>;
  emptyState?: ReactNode;
}

export function DataTable<TData extends RowData>({
  columns,
  data: _data,
  isLoading,
  config = {},
  emptyState,
}: DataTableProps<TData>) {
  const {
    enableDragAndDrop = false,
    enableRowSelection = false,
    enableColumnVisibility = true,
    enablePagination = true,
    pageSize = 10,
    pageIndex = 0,
    pageCount,
    pageSizeOptions = [10, 20, 30, 40, 50],
    onSortChange,
    onPageChange,
    onPageSizeChange,
    isServerSide = false,
    isSticky = false,
  } = config;

  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex, pageSize });

  const data = useMemo(() => {
    return _data ?? [];
  }, [_data]);

  const onSortingChange = useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;
      setSorting(newSorting);
      if (newSorting.length > 0 && onSortChange) {
        const sort = newSorting[0];
        if (sort)
          onSortChange(sort.id as keyof TData, sort.desc ? "desc" : "asc");
      }
    },
    [sorting, onSortChange],
  );

  const table = useTable({
    features,
    data,
    columns,
    onSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  // Skeleton headers derived from current table state
  const skeletonHeaders = useMemo(
    () =>
      table.getHeaderGroups()[0]?.headers.map((h) => ({
        id: h.id,
        colSpan: h.colSpan,
        isPlaceholder: h.isPlaceholder,
        column: h.column,
        getContext: () => h.getContext(),
      })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns], // headers only change when columns change
  );

  return (
    <div className="overflow-hidden rounded-xl border">
      {isLoading ? (
        <TableSkeleton
          columnCount={columns.length}
          rowCount={pageSize}
          headers={skeletonHeaders}
        />
      ) : (
        <ViewTable
          table={table}
          columns={columns}
          emptyState={emptyState}
          isSticky={isSticky}
        />
      )}
    </div>
  );
}
