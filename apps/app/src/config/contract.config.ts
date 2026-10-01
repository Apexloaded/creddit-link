import { Address } from "viem";
import { hardhat, robinhoodTestnet } from "viem/chains";

export const ORACLE_PRICE_DECIMALS = 18;
export const TOKEN_DECIMALS = {
  USDG: 6,
};

/**
 *  PROTOCOL CONTRACTS
 */
export enum Contracts {
  REGISTRY = "REGISTRY",
  ORACLE = "ORACLE",
  CREDIT_LINE = "CREDIT_LINE",
  RISK_ENGINE = "RISK_ENGINE",
  LIQUIDITY_POOL = "LIQUIDITY_POOL",
  LENS = "LENS",
  ROUTER = "ROUTER",
  RATE_MODEL = "RATE_MODEL",
  TREASURY = "TREASURY",
}

/**
 * PROTOCOL TOKENS
 */
export enum Tokens {
  USDG = "USDG",
  AAPL = "AAPL",
  AMZN = "AMZN",
  TSLA = "TSLA",
  SPCX = "SPCX",
  NVDA = "NVDA",
  NFLX = "NFLX",
  GOOGL = "GOOGL",
  IBM = "IBM",
}

/**
 * @name CREDDIT_CORE_HH
 * @description Creddit Protocol Contracts Addresses for Local Hardhat Network
 * @type {Record<Contracts, Address>}
 */
const CREDDIT_CORE_HH: Record<Contracts, Address> = {
  [Contracts.REGISTRY]: "0x998abeb3E57409262aE5b751f60747921B33613E",
  [Contracts.ORACLE]: "0xf5059a5D33d5853360D16C683c16e67980206f36",
  [Contracts.CREDIT_LINE]: "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f",
  [Contracts.RISK_ENGINE]: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
  [Contracts.LIQUIDITY_POOL]: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650",
  [Contracts.LENS]: "0x162A433068F51e18b7d13932F27e66a3f99E6890",
  [Contracts.ROUTER]: "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49",
  [Contracts.RATE_MODEL]: "0x95401dc811bb5740090279Ba06cfA8fcF6113778",
  [Contracts.TREASURY]: "0x851356ae760d987E095750cCeb3bC6014560891C",
};

/**
 * @name CREDDIT_TOKENS_HH
 * @description Creddit Protocol Tokens Addresses for Local Hardhat Network
 * @type {Record<Tokens, Address>}
 */
const CREDDIT_TOKENS_HH: Record<Tokens, Address> = {
  [Tokens.USDG]: "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F",
  [Tokens.AAPL]: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  [Tokens.AMZN]: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  [Tokens.TSLA]: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f",
  [Tokens.SPCX]: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
  [Tokens.NVDA]: "0x9A676e781A523b5d0C0e43731313A708CB607508",
  [Tokens.NFLX]: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
  [Tokens.GOOGL]: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  [Tokens.IBM]: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
};

/**
 * @name MOCK_PRICE_FEEDS_HH
 * @description Creddit Protocol MOCK PRICE FEEDS Addresses for Local Hardhat Network
 * @type {Record<Tokens, Address>}
 */
const MOCK_PRICE_FEEDS_HH: Record<Tokens, Address> = {
  [Tokens.USDG]: "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
  [Tokens.AAPL]: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  [Tokens.AMZN]: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  [Tokens.TSLA]: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
  [Tokens.SPCX]: "0x59b670e9fA9D0A427751Af201D676719a970857b",
  [Tokens.NVDA]: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  [Tokens.NFLX]: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  [Tokens.GOOGL]: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  [Tokens.IBM]: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
};

/**
 * @name CREDDIT_CORE_RH
 * @description Creddit Protocol Contracts Addresses for Robinhood Testnet
 * @type {Record<Contracts, Address>}
 */
const CREDDIT_CORE_RH: Record<Contracts, Address> = {
  [Contracts.REGISTRY]: "0xbEf6F15A944972588DA528B43D4d2Afa960C9410",
  [Contracts.ORACLE]: "0x7D4AE6dBed65c0eD176Be08110610d4D7293594B",
  [Contracts.CREDIT_LINE]: "0x3Fb5BAc4a1CD69Fcd21f9CA0C9A02e869ff2A455",
  [Contracts.RISK_ENGINE]: "0xb2418371B447A992559384064389bF27E2971246",
  [Contracts.LIQUIDITY_POOL]: "0xaAd892cb14df252D9D9c71A4bC5f473fE8b92229",
  [Contracts.LENS]: "0x334C5Cf1ad01C17249a9Ee6ABc35416d5212C47d",
  [Contracts.ROUTER]: "0xB9099d74EF460F017f6bAb52A4da4332f2379CEe",
  [Contracts.RATE_MODEL]: "0xDBD284240C31DD464e105b0Cd64C903c589dc728",
  [Contracts.TREASURY]: "0x7FcAFD8f08Ca1c307F5EaF23a0286ea78F5Db115",
};

/**
 * @name CREDDIT_TOKENS_RH
 * @description Creddit Protocol Tokens Addresses for Robinhood Testnet
 * @type {Record<Tokens, Address>}
 */
const CREDDIT_TOKENS_RH: Record<Tokens, Address> = {
  [Tokens.USDG]: "0x99EDcF79C3ADb442DDcDe329bf1Ac58273C92bfb",
  [Tokens.AAPL]: "0x5f7dcD4D1939dCC6e6842Cf20cc6f6d756B42A1F",
  [Tokens.AMZN]: "0xE0630812512F73cf11dC6306675818030e2AaD5f",
  [Tokens.TSLA]: "0x436fe0Bc696E3CABDDe7e96dc7511DA1DE5bb8C9",
  [Tokens.SPCX]: "0xaA2025d30E57A9B8Fe54Ea7f88BAc9d8a9C11a8f",
  [Tokens.NVDA]: "0xE59C29e9e217DB971929641AeAa9bFB67781c3E1",
  [Tokens.NFLX]: "0x3F6d06C97b058D80c8a2c86002121e3d8ACd22f8",
  [Tokens.GOOGL]: "0xeEAA3cc423A511C3b7F2141713E992073eA9EcC5",
  [Tokens.IBM]: "0x2eF11F008347382e66Fd9182e4921ad4a1A76Cf5",
};

/**
 * @name MOCK_PRICE_FEEDS_RH
 * @description Creddit Protocol MOCK PRICE FEEDS Addresses for Robinhood Testnet
 * @type {Record<Tokens, Address>}
 */
const MOCK_PRICE_FEEDS_RH: Record<Tokens, Address> = {
  [Tokens.USDG]: "0x945E046Fb99C28c1af713dA966f84EEd1FC0CE14",
  [Tokens.AAPL]: "0xF94Db17FF3eAc76c9E08Fe1A1Ec47638e6a8CA31",
  [Tokens.AMZN]: "0x8f833D0222A6E3e010b6607ed9A6b090De6D9221",
  [Tokens.TSLA]: "0x9DAdE49B1F45Cf442DA6E6AB8e6dD46527B72117",
  [Tokens.SPCX]: "0xE6a2a2B3192EF6b8dB675781A33fa9849e317AF0",
  [Tokens.NVDA]: "0x361585Ace5461d608bb47Bada108e514a897Ee58",
  [Tokens.NFLX]: "0xc90089351dBF7AFfd73C0B4dCF1480D8718519C1",
  [Tokens.GOOGL]: "0xC62e13345483fa8aE1a80382885de4b3B49f5319",
  [Tokens.IBM]: "0xE83437F705c77B3b39f69285f10c84d3c5Ee6749",
};

/**
 * @name CREDDIT_ADDRESSES
 * @description Creddit Protocol Contracts Addresses for all supported networks
 * @type {Record<number, { CORE: Record<Contracts, Address>; TOKENS: Record<Tokens, Address>; MOCK_PRICE_FEEDS: Record<Tokens, Address>; }>}
 * @example
 * const credditAddresses = CREDDIT_ADDRESSES[hardhat.id];
 * const creditLineAddress = credditAddresses.CORE[Contracts.CREDIT_LINE];
 * const aaplTokenAddress = credditAddresses.TOKENS[Tokens.AAPL];
 * const aaplPriceFeedAddress = credditAddresses.MOCK_PRICE_FEEDS[Tokens.AAPL];
 */
export const CREDDIT_ADDRESSES: Record<
  number,
  {
    CORE: Record<Contracts, Address>;
    TOKENS: Record<Tokens, Address>;
    MOCK_PRICE_FEEDS: Record<Tokens, Address>;
  }
> = {
  [hardhat.id]: {
    CORE: CREDDIT_CORE_HH,
    TOKENS: CREDDIT_TOKENS_HH,
    MOCK_PRICE_FEEDS: MOCK_PRICE_FEEDS_HH,
  },
  [robinhoodTestnet.id]: {
    CORE: CREDDIT_CORE_RH,
    TOKENS: CREDDIT_TOKENS_RH,
    MOCK_PRICE_FEEDS: MOCK_PRICE_FEEDS_RH,
  },
};
