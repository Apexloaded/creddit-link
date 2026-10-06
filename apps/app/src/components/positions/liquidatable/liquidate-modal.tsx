"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LiquidateForm from "./liquidate-form";
import { IPosition } from "@/interfaces/creddit-lens.interface";

type Props = {
  position: IPosition | null;
  open: boolean;
  onClose: () => void;
  positions?: IPosition[];
};

export default function LiquidateModal({
  position,
  open,
  onClose,
  positions = [],
}: Props) {
  if (!open || !position) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
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
          onClick={onClose}
          type="button"
          className="absolute top-4 left-4 bg-secondary"
          aria-label="Close"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        <DialogTitle className="sr-only">
          Liquidate Position #{position.id}
        </DialogTitle>

        {/* Modal Body */}
        <div className="flex flex-1 mx-auto max-w-3xl w-full">
          <LiquidateForm
            position={position}
            positions={positions}
            onCloseModal={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
