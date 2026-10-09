"use client";

import { useSwitchChain, useChainId, useChains } from "wagmi";
import { Check, Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAIN_ICONS } from "@/config/chain.config";

export function NetworkSwitcher() {
  const currentChainId = useChainId();
  const chains = useChains();
  const { mutate, isPending, error } = useSwitchChain();

  const currentIcon = CHAIN_ICONS[currentChainId];

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="outline"
            size="icon"
            disabled={isPending}
            aria-label="Switch Network"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : currentIcon ? (
              <img
                src={currentIcon}
                alt="Current Chain"
                className="h-5 w-5 rounded-full object-contain"
              />
            ) : (
              <Network className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[180px]">
          {chains.map((chain) => {
            const isSelected = chain.id === currentChainId;
            const chainIcon = CHAIN_ICONS[chain.id];

            return (
              <DropdownMenuItem
                key={chain.id}
                disabled={isSelected || isPending}
                onClick={() => mutate({ chainId: chain.id })}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {chainIcon ? (
                    <img
                      src={chainIcon}
                      alt={chain.name}
                      className="h-4 w-4 rounded-full object-contain"
                    />
                  ) : (
                    <Network className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{chain.name}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-xs font-medium text-destructive">{error.message}</p>
      )}
    </div>
  );
}
