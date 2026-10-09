"use client";

import { Container } from "@/components/ui/container";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCreddit } from "@/context/creddit.context";
import { PositionTable } from "@/components/positions/position-table";
import PositionFilters from "@/components/positions/position-filters";

export default function Page() {
  const { positions } = useCreddit();

  return (
    <Container className="px-8 pb-10 flex flex-col gap-10">
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="text-2xl font-mono font-semibold">Positions</p>
          <p className="text-muted-foreground">
            Track your open positions and their performance.
          </p>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <p className="text-sm text-muted-foreground">Active positions</p>
              <Tooltip>
                <TooltipTrigger>
                  <span className="inline-flex cursor-help">
                    <AlertCircle size={15} className="text-primary" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="w-60">
                  <p className="text-center">
                    Total value of all active stock collateral positions
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xl font-mono font-semibold">$13,000</p>
          </div>
          <Separator orientation="vertical" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <p className="text-sm text-muted-foreground">Drawn credits</p>
              <Tooltip>
                <TooltipTrigger>
                  <span className="inline-flex cursor-help">
                    <AlertCircle size={15} className="text-primary" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="w-60">
                  <p className="text-center">
                    Total amount of credit drawn across all open positions
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xl font-mono font-semibold">$0</p>
          </div>
          <Separator orientation="vertical" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <p className="text-sm text-muted-foreground">Available</p>
              <Tooltip>
                <TooltipTrigger>
                  <span className="inline-flex cursor-help">
                    <AlertCircle size={15} className="text-primary" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="w-60">
                  <p className="text-center">
                    Total amount of credit available to draw across all open
                    positions
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xl font-mono font-semibold">$0</p>
          </div>
        </div>
      </div>
      <PositionTable data={positions} />
    </Container>
  );
}
