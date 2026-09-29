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
  [Contracts.REGISTRY]: "0x95401dc811bb5740090279Ba06cfA8fcF6113778",
  [Contracts.ORACLE]: "0x851356ae760d987E095750cCeb3bC6014560891C",
  [Contracts.CREDIT_LINE]: "0xcbEAF3BDe82155F56486Fb5a1072cb8baAf547cc",
  [Contracts.RISK_ENGINE]: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650",
  [Contracts.LIQUIDITY_POOL]: "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0",
  [Contracts.USDG]: "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
  [Contracts.LENS]: "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f",
};

export const CREDDIT_ADDRESSES: Record<number, Record<Contracts, Address>> = {
  [hardhat.id]: CREDDIT_PROTOCOL_ADDRESSES,
  [robinhoodTestnet.id]: CREDDIT_PROTOCOL_ADDRESSES,
};
