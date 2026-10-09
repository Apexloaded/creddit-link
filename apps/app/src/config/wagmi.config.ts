import { createConfig, http } from "wagmi";
import { robinhood, robinhoodTestnet, hardhat } from "wagmi/chains";

const endpoint = (id: number) => `/api/rpc?chainId=${id}`;

export const config = createConfig({
  chains: [hardhat, robinhoodTestnet],
  connectors: [
    // injected(),
    // walletConnect({ projectId: envConfig.walletConnect.id }),
  ],
  transports: {
    // [robinhood.id]: http(endpoint(robinhood.id)),
    [robinhoodTestnet.id]: http(endpoint(robinhoodTestnet.id)),
    [hardhat.id]: http(endpoint(hardhat.id)),
  },
});
