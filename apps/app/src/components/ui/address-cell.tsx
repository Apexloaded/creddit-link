"use client";

import useClipboard from "@/hooks/use-clipboard";
import { addressGradient, truncate } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

type AddressCellProps = {
  address: string;
  canCopy?: boolean;
};

export function AddressCell({ address, canCopy = true }: AddressCellProps) {
  const { copy, isCopied } = useClipboard();

  return (
    <div className="group flex items-center gap-2">
      <span
        className="size-6 shrink-0 rounded-full"
        style={{ background: addressGradient(address) }}
      />
      <span className="font-mono text-foreground/70" title={address}>
        {truncate(address)}
      </span>
      {canCopy && (
        <button
          onClick={() => copy(address)}
          aria-label="Copy address"
          className="rounded p-1 cursor-pointer text-foreground/60 opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}
