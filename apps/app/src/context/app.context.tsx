"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
} from "react";
import { StorageKey } from "@/config/storage.config";
import { IAsset } from "@/interfaces/asset.interface";
import {
  CollateralPosition,
  useCollateralOf,
} from "@/hooks/contracts/use-collateral";
import { useErc20Details, useStorage, useAsset } from "@/hooks";
import { CREDDIT_ADDRESSES } from "@/config/contract.config";

type AppState = {
  chain: number;
  setChain: (chainId: number) => void;
  assets: IAsset[];
  selectedAsset: IAsset | undefined;
  setSelectedAsset: (value: IAsset | undefined) => void;
  positions: CollateralPosition[];
  totalPositionValueUsd: string;
  isListLoading: boolean;
  isDynamicLoading: boolean;
  usdgBalance: bigint;
  usdgUnitBalance: string;
  usdgAllowance: bigint;
  isUsdgLoading: boolean;
  refetchUsdg: () => void;
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
  const {
    balance: usdgBalance,
    allowance: usdgAllowance,
    isLoading: isUsdgLoading,
    refetch: refetchUsdg,
    unitBalance: usdgUnitBalance
  } = useErc20Details(
    CREDDIT_ADDRESSES[chain]?.USDG,
    CREDDIT_ADDRESSES[chain]?.LIQUIDITY_POOL
  );

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
      usdgBalance,
      usdgUnitBalance,
      usdgAllowance,
      isUsdgLoading,
      refetchUsdg,
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
      usdgBalance,
      usdgUnitBalance,
      usdgAllowance,
      isUsdgLoading,
      refetchUsdg,
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
