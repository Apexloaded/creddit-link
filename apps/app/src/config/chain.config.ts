import { hardhat, robinhood, robinhoodTestnet } from "viem/chains";

const isDev =
  (typeof process !== "undefined" && process.env.NODE_ENV === "development") ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV);

export const CHAIN_ICONS: Record<number, string> = {
  [robinhood.id]: "/icons/robinhood.svg",
  [robinhoodTestnet.id]: "/icons/robinhood.svg",
};

if (isDev) {
  CHAIN_ICONS[hardhat.id] = "/icons/hardhat.png";
}
