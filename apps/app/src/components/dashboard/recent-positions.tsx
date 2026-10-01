"use client";

import { useCreddit } from "@/context/creddit.context";
import { PositionTable } from "../positions/position-table";

function RecentPositions() {
  const { positions } = useCreddit();
  console.log(positions);
  return (
    <div className="pt-10">
      <div className="mb-5">
        <p className="text-2xl font-mono font-semibold">Positions</p>
      </div>
      <PositionTable data={positions} />
    </div>
  );
}

export default RecentPositions;
