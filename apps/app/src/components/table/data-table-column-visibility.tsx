"use client";

import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Settings2Icon } from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Column,
  flexRender,
  ReactTable,
  RowData,
  Table,
} from "@tanstack/react-table";
import { DataTableFeatures } from "./data-table-features";

function renderColumnHeader<TData extends RowData>(
  column: Column<DataTableFeatures, TData, unknown>,
  table: Table<DataTableFeatures, TData>,
): ReactNode {
  const header = column.columnDef.header;

  if (typeof header === "string") {
    return header;
  }

  if (typeof header === "function") {
    return flexRender(header, {
      column,
      header: { id: column.id, column },
      table,
    } as Parameters<typeof header>[0]);
  }

  return column.id;
}

type DateTableColumnVisibilityProps<TData extends RowData> = {
  table: ReactTable<DataTableFeatures, TData>;
};

function DataTableColumnVisibility<TData extends RowData>({
  table,
}: DateTableColumnVisibilityProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant={"secondary"} size="icon-lg" />}
      >
        <Settings2Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64"
        side={"bottom"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <div className="flex items-center justify-between">
            <DropdownMenuLabel className="text-xs uppercase">
              Properties
            </DropdownMenuLabel>
            <Button variant={"link"} className={"uppercase text-xs"}>
              reset
            </Button>
          </div>

          {table
            .getAllLeafColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== "undefined" && column.getCanHide(),
            )
            .map((column) => (
              <DropdownMenuItem
                key={column.id}
                onSelect={(e) => e.preventDefault()} // Keeps dropdown open
              >
                <label
                  className="flex w-full cursor-pointer items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>{renderColumnHeader(column, table)}</div>
                  <Switch
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  />
                </label>
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DataTableColumnVisibility;
