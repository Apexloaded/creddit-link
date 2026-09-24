import { createConfig, http } from 'wagmi';
import { robinhood, robinhoodTestnet } from 'wagmi/chains';
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'
import { envConfig } from './env.config';

export const config = createConfig({
  chains: [robinhood, robinhoodTestnet],
  connectors: [
    // injected(),
    // walletConnect({ projectId: envConfig.walletConnect.id }),
  ],
  transports: {
    [robinhood.id]: http(),
    [robinhoodTestnet.id]: http(),
  },
})