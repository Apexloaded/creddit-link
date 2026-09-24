"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { truncate } from "@/lib/utils";
import {
  SparklesIcon,
  BadgeCheckIcon,
  CreditCardIcon,
  BellIcon,
  LogOutIcon,
} from "lucide-react";
import { useConnection, useDisconnect } from "wagmi";
import { Button } from "../ui/button";

export function NavUser() {
  const { address } = useConnection();
  const { disconnect } = useDisconnect();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="h-9 group transition-colors hover:text-background duration-200 pl-1 pr-3 border bg-secondary rounded-full" />
        }
      >
        <Avatar className="size-7">
          <AvatarFallback
            className={
              "bg-conic/decreasing from-violet-700 via-lime-300 to-violet-700"
            }
          ></AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-sm text-left leading-tight">
          <span className="truncate text-foreground group-hover:text-background font-medium">
            {truncate(address)}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72"
        side={"bottom"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-foreground">
            Wallet
          </DropdownMenuLabel>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar>
                <AvatarFallback
                  className={
                    "bg-conic/decreasing from-violet-700 via-lime-300 to-violet-700"
                  }
                ></AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium text-foreground">
                  0xa898...7c2c
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <SparklesIcon />
            Upgrade to Pro
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheckIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCardIcon />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BellIcon />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()}>
          <LogOutIcon />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
