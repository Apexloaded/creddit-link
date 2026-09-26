"use client";

import { CREDDIT_PROTOCOL_ADDRESSES } from "@/config/contract.config";
import { credditOracleAbi } from "@/contracts/abis/credditOracleAbi";
import { Address } from "viem/accounts";
import { useReadContract } from "wagmi";

export function useGetUsdPrice(tokenAddress?: Address) {
  return useReadContract({
    address: CREDDIT_PROTOCOL_ADDRESSES.ORACLE,
    abi: credditOracleAbi,
    functionName: "getUsdPriceSafe",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 1000 * 60 * 5,
      select: (price) => ({
        usd: price,
      }),
    },
  });
}
