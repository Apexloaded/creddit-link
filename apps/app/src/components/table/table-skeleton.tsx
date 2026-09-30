"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import { flexRender } from "@tanstack/react-table";

interface TableSkeletonProps {
  columnCount: number;
  rowCount: number;
  headers: {
    id: string;
    colSpan: number;
    isPlaceholder: boolean;
    column: any;
    getContext: () => any;
  }[];
}

const TableSkeleton = React.memo(
  ({ columnCount, rowCount, headers }: TableSkeletonProps) => (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10">
          <TableRow>
            {headers.map((header) => (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
                className="border-r last-of-type:border-0 p-0 px-4"
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <TableCell
                  key={colIndex}
                  className="border-r last-of-type:border-0 px-4 py-2"
                >
                  <Skeleton className="h-6 w-full rounded-md" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
);

TableSkeleton.displayName = "TableSkeleton";

export default TableSkeleton;
