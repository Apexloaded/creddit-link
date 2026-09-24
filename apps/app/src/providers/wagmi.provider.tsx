"use client";

import { PropsWithChildren } from "react";
import { WagmiProvider as WagmiProviderWrapper } from 'wagmi';
import { config } from "@/config/wagmi.config";

export function WagmiProvider({ children }: PropsWithChildren) {
  return <WagmiProviderWrapper config={config}>{children}</WagmiProviderWrapper>;
}
