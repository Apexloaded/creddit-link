"use client";

import { Input } from "../ui/input"
import { Search, SearchIcon } from "lucide-react"
import { WalletConnect } from "../wallet/wallet-connect"
import { InputGroup, InputGroupInput, InputGroupAddon } from "../ui/input-group";

export function AppHeader() {
  return (
    <header className="flex h-16 px-8 stick top-0 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
      <div className="flex flex-1 items-center justify-between gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupInput placeholder="Search for an asset..." />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <WalletConnect />
      </div>
    </header>
  );
}