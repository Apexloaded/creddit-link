"use client";

import { Input } from "../ui/input"
import { SearchIcon } from "lucide-react"
import { WalletConnect } from "../wallet/wallet-connect"

export function AppHeader() {
  return (
    <header className="flex h-16 px-8 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="relative flex items-center">
          <SearchIcon size={16} className="absolute left-3 text-foreground/50" />
          <Input className="md:w-96 pl-10" placeholder="Search for an asset..." />
        </div>
        <WalletConnect />
      </div>
    </header>
  )
}