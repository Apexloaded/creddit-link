export const envConfig = {
  app: {
    name: process.env.APP_NAME || "Creddit Link",
    hostname: process.env.HOSTNAME || undefined,
    defaultChain: Number(process.env.DEFAULT_CHAIN || 46630),
    blurHash: process.env.NEXT_PUBLIC_DEFAULT_NEUTRAL_BLURHASH!
  }
};

export type EnvConfig = typeof envConfig;
