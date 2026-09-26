"use client";

import { useReadContracts, useConnection } from "wagmi";
import { Address } from "viem";
import { erc20Abi } from "@/contracts/abis/erc20Abi";

export function useErc20Details(tokenAddress?: Address, spender?: Address) {
  const { address: userAddress } = useConnection();

  const contracts = tokenAddress
    ? [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol" as const,
      },
      { address: tokenAddress, abi: erc20Abi, functionName: "name" as const },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals" as const,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: userAddress ? [userAddress] : undefined,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance" as const,
        args: userAddress ? [userAddress, spender] : undefined,
      },
    ]
    : [];

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: spender ? Boolean(spender) && Boolean(tokenAddress) : Boolean(tokenAddress),
      staleTime: 1000 * 15,
    },
  });

  return {
    symbol: (data?.[0]?.result as string) ?? "",
    name: (data?.[1]?.result as string) ?? "",
    decimals: (data?.[2]?.result as number) ?? 18,
    balance: (data?.[3]?.result as bigint) ?? BigInt(0),
    allowance: (data?.[4]?.result as bigint) ?? BigInt(0),
    isLoading,
    refetch,
  };
}
