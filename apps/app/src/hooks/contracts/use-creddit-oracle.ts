"use client";

import { useReadContract } from "wagmi";
import { Contracts } from "@/config";
import { useCredditAddresses } from "./use-creddit-addresses";
import { credditOracleAbi } from "@/contracts/abis/credditOracleAbi";

export function useCredditOracle() {
  const { getContract } = useCredditAddresses();
  const oracleAddress = getContract(Contracts.ORACLE);

  /**
   * 1. Fetch the USD price of a token from the Creddit Oracle contract
   * @param tokenAddress The address of the token to fetch the USD price for
   * @returns The USD price of the token in 18 decimals
   */
  const useGetUsdPrice = (tokenAddress: `0x${string}` | undefined) => {
    return useReadContract({
      address: oracleAddress,
      abi: credditOracleAbi,
      functionName: "getUsdPriceSafe",
      args: [tokenAddress!],
      query: {
        enabled: Boolean(tokenAddress),
        staleTime: 1000 * 60 * 5,
        select: (price) => ({
          usd: price,
        }),
      },
    });
  };

  return {
    useGetUsdPrice,
  };
}
