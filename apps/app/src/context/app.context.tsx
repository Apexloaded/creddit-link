"use client";

import { createContext, useContext, useMemo } from "react";
import { useStorage } from "@/hooks/storage.hook";
import { StorageKey } from "@/config/storage.config";

type AppState = {
  chain: number;
  setChain: (chainId: number) => void;
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [chain, setChain] = useStorage(StorageKey.APP_CHAIN_ID);

  const contextValue = useMemo(
    () => ({
      chain,
      setChain,
    }),
    [chain],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within a AppProvider");
  }
  return context;
}
