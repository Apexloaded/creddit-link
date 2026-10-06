"use client";

import { useCredditLens } from "@/hooks";
import { LiquidatableTable } from "../positions/liquidatable/liquidatable-table";

function LiquidatablePositions() {
  const { useLiquidatablePositions } = useCredditLens();
  const { data: positions } = useLiquidatablePositions(BigInt(1), BigInt(100));
  return (
    <div className="pt-10">
      <div className="mb-5">
        <p className="text-2xl font-mono font-semibold">Liquidatables</p>
      </div>
      <LiquidatableTable data={positions ?? []} />
    </div>
  );
}

export default LiquidatablePositions;
