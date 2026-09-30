import { Address } from "viem";
import { hardhat, robinhoodTestnet } from "viem/chains";

enum Contracts {
  /**
   *  PROTOCOL CONTRACTS
   */
  REGISTRY = "REGISTRY",
  ORACLE = "ORACLE",
  CREDIT_LINE = "CREDIT_LINE",
  RISK_ENGINE = "RISK_ENGINE",
  LIQUIDITY_POOL = "LIQUIDITY_POOL",
  LENS = "LENS",

  /**
   * PROTOCOL TOKENS
   */
  USDG = "USDG",
}

export const ORACLE_PRICE_DECIMALS = 18;
export const TOKEN_DECIMALS = {
  USDG: 6,
};

export const CREDDIT_PROTOCOL_ADDRESSES: Record<Contracts, Address> = {
  [Contracts.REGISTRY]: "0x998abeb3E57409262aE5b751f60747921B33613E",
  [Contracts.ORACLE]: "0xf5059a5D33d5853360D16C683c16e67980206f36",
  [Contracts.CREDIT_LINE]: "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f",
  [Contracts.RISK_ENGINE]: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
  [Contracts.LIQUIDITY_POOL]: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650",
  [Contracts.USDG]: "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F",
  [Contracts.LENS]: "0x162A433068F51e18b7d13932F27e66a3f99E6890",
};

export const CREDDIT_ADDRESSES: Record<number, Record<Contracts, Address>> = {
  [hardhat.id]: CREDDIT_PROTOCOL_ADDRESSES,
  [robinhoodTestnet.id]: CREDDIT_PROTOCOL_ADDRESSES,
};

