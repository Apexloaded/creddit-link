import React from "react";
import { Button } from "../ui/button";
import { PlusIcon, SquareArrowDownIcon, SquareArrowUpIcon } from "lucide-react";
import { cn } from "cn";
import Link from "next/link";
import { routes } from "@/lib/route";

type Props = {
  className?: string;
};
function QuickAction({ className }: Props) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className="text-2xl font-mono font-semibold">Good morning</p>
      <div className="flex items-center gap-1">
        <Button
          render={<Link href={routes.app.deposit} />}
          size={"lg"}
          className={"text-background"}
        >
          <SquareArrowDownIcon />
          Deposit
        </Button>
        <Button size={"lg"} variant={"secondary"}>
          <SquareArrowUpIcon />
          Borrow
        </Button>
        <Button size={"icon-lg"} variant={"secondary"}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

export default QuickAction;
