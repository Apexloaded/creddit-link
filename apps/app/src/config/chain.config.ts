import { hardhat, robinhood, robinhoodTestnet } from "viem/chains";

export const CHAIN_ICONS: Record<number, string> = {
  [robinhood.id]: "/icons/robinhood.svg",
  [robinhoodTestnet.id]: "/icons/robinhood.svg",
  [hardhat.id]: "/icons/hardhat.png",
};
