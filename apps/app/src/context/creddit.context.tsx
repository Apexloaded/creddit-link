"use client";

import { createContext, useContext, useMemo } from "react";
import { StorageKey } from "@/config/storage.config";
import { IAsset } from "@/interfaces/asset.interface";
import {
  useErc20Details,
  useStorage,
  useAsset,
  useCredditAddresses,
} from "@/hooks";
import { Contracts, Tokens } from "@/config/contract.config";
import { useCredditLens } from "@/hooks/contracts/use-creddit-lens";
import { IPortfolio, IPosition } from "@/interfaces/creddit-lens.interface";

type CredditState = {
  chain: number;
  setChain: (chainId: number) => void;
  assets: IAsset[];
  selectedAsset: IAsset | undefined;
  setSelectedAsset: (value: IAsset | undefined) => void;
  isListLoading: boolean;
  isDynamicLoading: boolean;
  usdgBalance: bigint;
  usdgUnitBalance: string;
  usdgAllowance: bigint;
  isUsdgLoading: boolean;
  refetchUsdg: () => void;
  portfolio: IPortfolio | undefined;
  positions: IPosition[];
  isLoadingPortfolio: boolean;
  isLoadingPositions: boolean;
  isError: boolean;
  refetchPortfolio: () => void;
  refetchPositions: () => void;
};

const CredditContext = createContext<CredditState | undefined>(undefined);

export function CredditProvider({ children }: { children: React.ReactNode }) {
  const [chain, setChain] = useStorage(StorageKey.APP_CHAIN_ID);
  const { useUserPortfolio, useUserPositions } = useCredditLens();
  const { getContract, getToken } = useCredditAddresses();
  const poolAddress = getContract(Contracts.LIQUIDITY_POOL);
  const usdgTokenAddress = getToken(Tokens.USDG);

  const {
    assets = [],
    selectedAsset,
    setSelectedAsset,
    isListLoading = false,
    isDynamicLoading = false,
  } = useAsset();

  const {
    balance: usdgBalance,
    allowance: usdgAllowance,
    isLoading: isUsdgLoading,
    refetch: refetchUsdg,
    unitBalance: usdgUnitBalance,
  } = useErc20Details(usdgTokenAddress, poolAddress);

  const {
    data: portfolio,
    isLoading: isLoadingPortfolio,
    isError: isPortfolioError,
    refetch: refetchPortfolio,
  } = useUserPortfolio();

  const {
    data: positions,
    isLoading: isLoadingPositions,
    isError: isPositionsError,
    refetch: refetchPositions,
  } = useUserPositions();

  const contextValue = useMemo(
    () => ({
      chain,
      setChain,
      assets,
      selectedAsset,
      setSelectedAsset,
      isListLoading,
      isDynamicLoading,
      usdgBalance,
      usdgUnitBalance,
      usdgAllowance,
      isUsdgLoading,
      refetchUsdg,
      portfolio,
      positions: positions ?? [],
      isLoadingPortfolio,
      isLoadingPositions,
      isError: isPortfolioError || isPositionsError,
      refetchPortfolio,
      refetchPositions,
    }),
    [
      chain,
      setChain,
      assets,
      selectedAsset,
      setSelectedAsset,
      isListLoading,
      isDynamicLoading,
      usdgBalance,
      usdgUnitBalance,
      usdgAllowance,
      isUsdgLoading,
      refetchUsdg,
      portfolio,
      positions,
      isLoadingPortfolio,
      isLoadingPositions,
      isPortfolioError,
      isPositionsError,
      refetchPortfolio,
      refetchPositions,
    ],
  );

  return (
    <CredditContext.Provider value={contextValue}>
      {children}
    </CredditContext.Provider>
  );
}

export function useCreddit() {
  const context = useContext(CredditContext);
  if (context === undefined) {
    throw new Error("useCreddit must be used within a CredditProvider");
  }
  return context;
}
