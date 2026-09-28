"use client";

import { useMemo } from "react";
import { useReadContracts, useAccount } from "wagmi";
import { Address, formatUnits } from "viem";
import { erc20Abi } from "@/contracts/abis/erc20Abi";

export function useErc20Details(tokenAddress?: Address, spender?: Address) {
  const { address: userAddress } = useAccount();

  const contracts = useMemo(() => {
    if (!tokenAddress) return [];

    return [
      { address: tokenAddress, abi: erc20Abi, functionName: "symbol" } as const,
      { address: tokenAddress, abi: erc20Abi, functionName: "name" } as const,
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      } as const,
      ...(userAddress
        ? [
            {
              address: tokenAddress,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [userAddress],
            } as const,
          ]
        : []),
      ...(userAddress && spender
        ? [
            {
              address: tokenAddress,
              abi: erc20Abi,
              functionName: "allowance",
              args: [userAddress, spender],
            } as const,
          ]
        : []),
    ];
  }, [tokenAddress, spender, userAddress]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 1000 * 15,
    },
  });

  return useMemo(() => {
    // Map results back to calls by functionName instead of trusting index position
    const resultFor = (fnName: string) => {
      const idx = contracts.findIndex((c) => c.functionName === fnName);
      return idx === -1 ? undefined : data?.[idx];
    };

    const symbolResult = resultFor("symbol");
    const nameResult = resultFor("name");
    const decimalsResult = resultFor("decimals");
    const balanceResult = resultFor("balanceOf");
    const allowanceResult = resultFor("allowance");

    const symbol =
      symbolResult?.status === "success" ? (symbolResult.result as string) : "";
    const name =
      nameResult?.status === "success" ? (nameResult.result as string) : "";
    const decimals =
      decimalsResult?.status === "success"
        ? (decimalsResult.result as number)
        : 18;

    const balance =
      userAddress && balanceResult?.status === "success"
        ? (balanceResult.result as bigint)
        : BigInt(0);

    const unitBalance = formatUnits(balance, decimals);

    const allowance =
      userAddress && spender && allowanceResult?.status === "success"
        ? (allowanceResult.result as bigint)
        : BigInt(0);

    return {
      symbol,
      name,
      decimals,
      balance,
      unitBalance,
      allowance,
      isLoading,
      refetch,
    };
  }, [data, contracts, userAddress, spender, isLoading, refetch]);
}
