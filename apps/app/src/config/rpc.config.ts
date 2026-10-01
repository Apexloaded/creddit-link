"server-only";

import { hardhat, robinhood, robinhoodTestnet } from "viem/chains";

/**
 * Maps chain IDs to secret server-side RPC URLs. These URLs are not exposed to the client and are used for server-side operations that require a connection to the blockchain.
 * The keys are the chain IDs, and the values are the corresponding RPC URLs retrieved from environment variables.
 * This mapping allows the server to dynamically select the appropriate RPC URL based on the chain ID provided in requests.
 * @type {Record<number, string | undefined>}
 */
const CHAIN_RPC_MAP: Record<number, string | undefined> = {
  [robinhood.id]: process.env.NEXT_PRIVATE_RH_RPC_URL,
  [robinhoodTestnet.id]: process.env.NEXT_PRIVATE_RH_TESTNET_RPC_URL,
  [hardhat.id]: process.env.NEXT_PRIVATE_LOCAL_RPC_URL,
};

/**
 * Retrieves the private RPC URL for a given chain ID.
 */
export function getRpcUrlForChain(chainId: number): string | undefined {
  return CHAIN_RPC_MAP[chainId];
}
