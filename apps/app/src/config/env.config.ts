import { hardhat, robinhoodTestnet } from "viem/chains";

const required = (name: string) => {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return process.env[name]!;
};

const keys = {
  app: {
    name: "APP_NAME",
    hostname: "HOSTNAME",
    defaultChain: "DEFAULT_CHAIN",
    blurHash: "DEFAULT_NEUTRAL_BLURHASH",
  },
  walletConnect: {
    projectId: "WALLETCONNECT_PROJECT_ID",
  },
  contracts: {
    registry: "NEXT_PUBLIC_ASSET_REGISTRY",
  },
};

const envDefaults = {
  app: {
    name: "Creddit Link",
    hostname: undefined,
    defaultChain: hardhat.id,
  },
  walletConnect: {
    projectId: "6a034e0c62ffce25a8871e9f767b4a57",
  }
};

export const envConfig = {
  app: {
    name: process.env[keys.app.name] || envDefaults.app.name,
    hostname: process.env[keys.app.hostname] || envDefaults.app.hostname,
    defaultChain: Number(
      process.env[keys.app.defaultChain] || envDefaults.app.defaultChain,
    ),
    blurHash: process.env[keys.app.blurHash]!,
  },
  walletConnect: {
    id: process.env[keys.walletConnect.projectId],
  }
};

export type EnvConfig = typeof envConfig;
