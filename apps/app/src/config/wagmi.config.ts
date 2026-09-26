import { createConfig, http } from "wagmi";
import { robinhood, robinhoodTestnet, hardhat } from "wagmi/chains";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { envConfig } from "./env.config";

export const config = createConfig({
  chains: [ hardhat],
  connectors: [
    // injected(),
    // walletConnect({ projectId: envConfig.walletConnect.id }),
  ],
  transports: {
    // [robinhood.id]: http(),
    // [robinhoodTestnet.id]: http(),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});
