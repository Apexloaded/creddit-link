"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
} from "react";
import { useStorage } from "@/hooks/use-storage";
import { StorageKey } from "@/config/storage.config";
import useAsset from "@/hooks/use-asset";
import { IAsset } from "@/interfaces/asset.interface";

type AppState = {
  chain: number;
  setChain: (chainId: number) => void;
  assets: IAsset[];
  selectedAsset: IAsset | undefined;
  setSelectedAsset: Dispatch<SetStateAction<IAsset | undefined>>;
  isListLoading: boolean;
  isDynamicLoading: boolean;
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [chain, setChain] = useStorage(StorageKey.APP_CHAIN_ID);
  const {
    assets = [],
    selectedAsset,
    setSelectedAsset,
    isListLoading = false,
    isDynamicLoading = false,
  } = useAsset();

  const contextValue = useMemo(
    () => ({
      chain,
      setChain,
      assets,
      selectedAsset,
      setSelectedAsset,
      isListLoading,
      isDynamicLoading,
    }),
    [
      chain,
      setChain,
      assets,
      selectedAsset,
      setSelectedAsset,
      isListLoading,
      isDynamicLoading,
    ],
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
