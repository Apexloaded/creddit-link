"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  ArrowUpDownIcon,
  ChevronsUpDownIcon,
  InfoIcon,
  XIcon,
} from "lucide-react"; // or your project's X icon
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";

export default function DepositCollateral() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);

    setTimeout(() => {
      if (typeof window !== "undefined" && window.history.length > 2) {
        router.back();
      } else {
        router.push("/");
      }
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        // 1. Hide the built-in top-right close button
        showCloseButton={false}

        // 2. Override default modal centering & width constraints with important (!) flags
        className={cn(
          "fixed! top-0! left-0! inset-0! z-50!",
          "h-screen! w-screen! max-w-none!",
          "translate-x-0! translate-y-0!",
          "rounded-none! border-none! shadow-none!",
          "bg-background! p-6",
        )}
      >
        {/* Custom Top-Left Close Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClose}
          type="button"
          className="absolute top-4 left-4 bg-secondary"
          aria-label="Close"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        <DialogTitle className="sr-only">Deposit Collateral</DialogTitle>

        {/* Modal Body */}
        <div className="flex flex-col gap-3 mx-auto max-w-lg w-full pt-12">
          <div>
            <p className="text-2xl font-semibold">Deposit Collateral</p>
            <p className="mt-1 text-foreground">
              Configure and deposit your collateral on Creddit Link
            </p>
          </div>
          <div className="flex flex-col gap-2 bg-accent rounded-3xl px-6 py-4 mt-3">
            <p>Deposit</p>
            <div className="flex justify-between items-center">
              <Input
                className="md:text-5xl flex-1 text-primary h-14 p-0 rounded-none shadow-none focus-visible:ring-0 border-0 caret-primary"
                placeholder="0.00"
              />
              <div className="flex gap-1 items-center transition-colors duration-200 hover:bg-background/80 cursor-pointer bg-background rounded-full px-3 p-2">
                <p className="text-md">ETH</p>
                <ChevronsUpDownIcon size={15} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <ArrowUpDownIcon size={17} />
                <p>$0.00</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1">
                  <p>Balance: </p>
                  <p>0.00</p>
                </div>
                <Button size={"xs"}>Max</Button>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="">Deposit LTV</p>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon size={15} className="opacity-50 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-center">
                      The maximum loan amount you can borrow against your
                      deposited collateral.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="">78.9%</p>
            </div>
          </div>
          <div className="flex flex-col py-3 gap-2 bg-accent rounded-3xl px-6 mt-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <p className="">Use as collateral</p>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon size={15} className="opacity-50 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-center">
                      Enable this assets to be used as collateral for borrowing
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div>
                <Switch />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <p className="">Collateral factor</p>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon size={15} className="opacity-50 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-center">
                      The percentage of your collateral that can be used to
                      borrow assets
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="">78.9%</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <p className="">Collateral risk</p>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon size={15} className="opacity-50 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-center">
                      A factor determining the risk of your collateral. Higher
                      factor means lower risk.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="">0.00%</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <p className="">Borrowable assets</p>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon size={15} className="opacity-50 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-center">
                      The assets you can borrow against your collateral.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="">78.9%</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <Button
              onClick={handleClose}
              type="button"
              size={"xl"}
              variant={"outline"}
              className={"flex-1"}
            >
              Cancel
            </Button>
            <Button disabled={true} size={"xl"} className={"flex-1"}>
              Deposit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
