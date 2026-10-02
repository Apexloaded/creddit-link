"use client";

import { useConnection } from "wagmi";
import { CREDDIT_ADDRESSES, Contracts, Tokens } from "@/config/contract.config";
import { envConfig } from "@/config";

export function useCredditAddresses(overrideChainId?: number) {
  const { chainId: activeChainId } = useConnection();
  const chainId =
    overrideChainId ?? activeChainId ?? envConfig.app.defaultChain;
  const addresses = CREDDIT_ADDRESSES[chainId];

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
