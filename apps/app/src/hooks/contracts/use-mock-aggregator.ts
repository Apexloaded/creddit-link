import { useCallback, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useConnection,
} from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { mockAggregatorV3Abi } from "@/contracts/abis/mockAggregatorV3Abi";

export interface MockAggregatorState {
  roundId: bigint;
  answer: bigint;
  formattedPrice: string;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
  decimals: number;
}

export function useMockAggregator(address?: Address) {
  const publicClient = usePublicClient();

  const {
    writeContractAsync,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // 1. Fetch Decimals
  const { data: decimals } = useReadContract({
    address,
    abi: mockAggregatorV3Abi,
    functionName: "decimals",
    query: { enabled: !!address },
  });

  // 2. Fetch Latest Round Data
  const {
    data: roundData,
    refetch,
    isLoading: isLoadingData,
  } = useReadContract({
    address,
    abi: mockAggregatorV3Abi,
    functionName: "latestRoundData",
    query: { enabled: !!address },
  });

  console.log(roundData);

  // Refetch data automatically when a write transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetch();
    }
  }, [isConfirmed, refetch]);

  // Format contract output into a developer-friendly state
  const state: MockAggregatorState | null =
    roundData && decimals !== undefined
      ? {
          roundId: roundData[0],
          answer: roundData[1],
          formattedPrice: formatUnits(roundData[1], decimals),
          startedAt: roundData[2],
          updatedAt: roundData[3],
          answeredInRound: roundData[4],
          decimals,
        }
      : null;

  /**
   * Set price using a human-readable string (e.g., "150.50")
   */
  const setPrice = useCallback(
    async (priceFormatted: string) => {
      if (!address || decimals === undefined)
        throw new Error("Contract address or decimals not loaded");
      const rawPrice = parseUnits(priceFormatted, decimals);

      return writeContractAsync({
        address,
        abi: mockAggregatorV3Abi,
        functionName: "setAnswer",
        args: [rawPrice],
      });
    },
    [address, decimals, writeContractAsync],
  );

  /**
   * Set exact Unix timestamp for updatedAt
   */
  const setUpdatedAt = useCallback(
    async (timestampSeconds: number | bigint) => {
      if (!address) throw new Error("Contract address missing");

      return writeContractAsync({
        address,
        abi: mockAggregatorV3Abi,
        functionName: "setUpdatedAt",
        args: [BigInt(timestampSeconds)],
      });
    },
    [address, writeContractAsync],
  );

  /**
   * Fast-forward timestamp by delta seconds (or set to current block timestamp)
   */
  const refreshTimestampToNow = useCallback(async () => {
    if (!address || !publicClient)
      throw new Error("Client or contract address missing");
    const block = await publicClient.getBlock();

    return writeContractAsync({
      address,
      abi: mockAggregatorV3Abi,
      functionName: "setUpdatedAt",
      args: [block.timestamp],
    });
  }, [address, publicClient, writeContractAsync]);

  /**
   * Trigger an incomplete round condition (answeredInRound < roundId)
   */
  const triggerIncompleteRound = useCallback(async () => {
    if (!address) throw new Error("Contract address missing");

    return writeContractAsync({
      address,
      abi: mockAggregatorV3Abi,
      functionName: "setIncompleteRound",
    });
  }, [address, writeContractAsync]);

  /**
   * Set raw round data manually
   */
  const setRoundData = useCallback(
    async (params: {
      roundId: bigint;
      answer: bigint;
      startedAt: bigint;
      updatedAt: bigint;
      answeredInRound: bigint;
    }) => {
      if (!address) throw new Error("Contract address missing");

      return writeContractAsync({
        address,
        abi: mockAggregatorV3Abi,
        functionName: "setRoundData",
        args: [
          params.roundId,
          params.answer,
          params.startedAt,
          params.updatedAt,
          params.answeredInRound,
        ],
      });
    },
    [address, writeContractAsync],
  );

  return {
    state,
    isLoading: isLoadingData,
    isPending: isWriting || isConfirming,
    isSuccess: isConfirmed,
    error: writeError,
    setPrice,
    setUpdatedAt,
    refreshTimestampToNow,
    triggerIncompleteRound,
    setRoundData,
    refetch,
  };
}
