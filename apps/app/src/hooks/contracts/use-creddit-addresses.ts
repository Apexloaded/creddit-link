"use client";

import { useChainId } from "wagmi";
import { CREDDIT_ADDRESSES, Contracts, Tokens } from "@/config/contract.config";
import { envConfig } from "@/config";

export function useCredditAddresses(overrideChainId?: number) {
  const activeChainId = useChainId();
  console.log("useCredditAddresses activeChainId:", activeChainId);
  const chainId = overrideChainId ?? activeChainId;
  console.log(chainId, "useCredditAddresses chainId:", chainId);
  const addresses =
    CREDDIT_ADDRESSES[chainId] ?? CREDDIT_ADDRESSES[envConfig.app.defaultChain];

  return {
    chainId,
    isSupported: Boolean(CREDDIT_ADDRESSES[chainId]),
    core: addresses.CORE,
    tokens: addresses.TOKENS,
    priceFeeds: addresses.MOCK_PRICE_FEEDS,
    getContract: (contract: Contracts) => addresses.CORE[contract],
    getToken: (token: Tokens) => addresses.TOKENS[token],
    getPriceFeed: (token: Tokens) => addresses.MOCK_PRICE_FEEDS[token],
  };
}
