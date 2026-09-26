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
import {
  CollateralPosition,
  useCollateralOf,
} from "@/hooks/contracts/use-collateral";

type AppState = {
  chain: number;
  setChain: (chainId: number) => void;
  assets: IAsset[];
  selectedAsset: IAsset | undefined;
  setSelectedAsset: Dispatch<SetStateAction<IAsset | undefined>>;
  positions: CollateralPosition[];
  totalPositionValueUsd: string;
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
  const { positions, totalUsdValue } = useCollateralOf(assets);

  const contextValue = useMemo(
    () => ({
      chain,
      setChain,
      assets,
      selectedAsset,
      setSelectedAsset,
      positions,
      totalPositionValueUsd: totalUsdValue,
      isListLoading,
      isDynamicLoading,
    }),
    [
      chain,
      setChain,
      assets,
      selectedAsset,
      setSelectedAsset,
      positions,
      totalUsdValue,
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
