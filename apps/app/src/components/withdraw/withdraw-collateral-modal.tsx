"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCreddit } from "@/context/creddit.context";
import WithdrawCollateralForm from "./withdraw-collateral-form";

export default function WithdrawCollateralModal() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { positions } = useCreddit();

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
        showCloseButton={false}
        className={cn(
          "fixed! top-0! left-0! inset-0! z-50!",
          "h-screen! w-screen! max-w-none!",
          "translate-x-0! translate-y-0!",
          "rounded-none! border-none! shadow-none!",
          "bg-background! p-6 h-svh flex",
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

        <DialogTitle className="sr-only">Withdraw Collateral</DialogTitle>

        {/* Modal Body */}
        <div className="flex flex-1 mx-auto max-w-3xl w-full">
          <WithdrawCollateralForm
            onCloseModal={handleClose}
            positions={positions}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
