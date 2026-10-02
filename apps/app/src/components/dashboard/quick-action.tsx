"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  PlusCircleIcon,
  PlusIcon,
  SquareArrowDownIcon,
  SquareArrowUpIcon,
} from "lucide-react";
import { cn } from "cn";
import Link from "next/link";
import { routes } from "@/lib/route";

type Props = {
  className?: string;
};

function getGreetingMessage(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

function QuickAction({ className }: Props) {
  const [greeting, setGreeting] = useState<string>("Good morning");

  useEffect(() => {
    setGreeting(getGreetingMessage());
  }, []);

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className="text-2xl font-mono font-semibold">{greeting}</p>
      <div className="flex items-center gap-1">
        <Button
          render={<Link href={routes.app.deposit()} />}
          size={"lg"}
          className={"text-background"}
        >
          <SquareArrowDownIcon />
          Deposit
        </Button>
        <Button
          size={"lg"}
          variant={"secondary"}
          render={<Link href={routes.app.borrow} />}
        >
          <SquareArrowUpIcon />
          Borrow
        </Button>
        <Button
          size={"lg"}
          variant={"secondary"}
          render={<Link href={routes.app.earn} />}
        >
          <PlusCircleIcon />
          Earn
        </Button>
        <Button size={"icon-lg"} variant={"secondary"}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

export default QuickAction;
