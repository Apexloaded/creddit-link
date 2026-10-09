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
  AMD = "AMD",
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
  [Tokens.AMD]: "0x0000000000000000000000000000000000000000",
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
  [Tokens.AMD]: "0x0000000000000000000000000000000000000000",
};

/**
 * @name CREDDIT_CORE_RH
 * @description Creddit Protocol Contracts Addresses for Robinhood Testnet
 * @type {Record<Contracts, Address>}
 */
const CREDDIT_CORE_RH: Record<Contracts, Address> = {
  [Contracts.REGISTRY]: "0xeE3908e2EceCABE1099DA754dd9dA810713cbd24",
  [Contracts.ORACLE]: "0x63df942907df9EeA79c49210AE5a35797Ea54d99",
  [Contracts.CREDIT_LINE]: "0x72c32C7Afe69A61DAEaeE8B50cF9e2DCa29f25dc",
  [Contracts.RISK_ENGINE]: "0xA9701E3467DCb62202a625437572cE02b1B06FaF",
  [Contracts.LIQUIDITY_POOL]: "0x8184B8f89A0C566f139da6fb20D3277B707Fd8D8",
  [Contracts.LENS]: "0x3cc56a64029D84FC8f7F28ac9Bc4A8D4f23ca7F3",
  [Contracts.ROUTER]: "0x63f7E6ACffb30eC56A3E6C5A3357170D4835E289",
  [Contracts.RATE_MODEL]: "0x5Db9eB7f734a31a7A7923a7B72cF580C14cc4cDF",
  [Contracts.TREASURY]: "0x14962F82aA41342aF3Ac76b3B154732875eE5403",
};

/**
 * @name CREDDIT_TOKENS_RH
 * @description Creddit Protocol Tokens Addresses for Robinhood Testnet
 * @type {Record<Tokens, Address>}
 */
const CREDDIT_TOKENS_RH: Record<Tokens, Address> = {
  [Tokens.USDG]: "0xBBa516FE1F9e190483F49958C16Dc646aB2BCc18",
  [Tokens.AAPL]: "0x9aBDFAf46823e49FB13Fc562E8790865001f3F2D",
  [Tokens.AMZN]: "0x5C3A61010C799049F303545b5946C37645781623",
  [Tokens.TSLA]: "0x368f8217041e49644c264Aa6FF032c64E99F29c1",
  [Tokens.SPCX]: "0x58b1F13B67a74848c7945C4b3279885246a63A2b",
  [Tokens.NVDA]: "0x8034d1Ea3841Fea7F56F0931118F9039d13367E9",
  [Tokens.NFLX]: "0xcb705D3d006C45C5769656Dd931646aA433893bc",
  [Tokens.GOOGL]: "0x06BCB69FAafD4Da8E4755F1bd7A2cE9Af71EaA9f",
  [Tokens.IBM]: "0xb2C165BE64B1c4Cf485C27970bc627D396A712b3",
  [Tokens.AMD]: "0x71178BAc73cBeb415514eB542a8995b82669778d",
};

/**
 * @name MOCK_PRICE_FEEDS_RH
 * @description Creddit Protocol MOCK PRICE FEEDS Addresses for Robinhood Testnet
 * @type {Record<Tokens, Address>}
 */
const MOCK_PRICE_FEEDS_RH: Record<Tokens, Address> = {
  [Tokens.USDG]: "0x8ef66290507B9f52F3418500C958fc22b2F08597",
  [Tokens.AAPL]: "0xD74f26f7E55da4F775D77793D79DDfC6EBe5BEC9",
  [Tokens.AMZN]: "0xb195C1d97F48e54C513FD2Bbad08fD6A2d1786cf",
  [Tokens.TSLA]: "0xC652594f0986f93A50D64d3045B0225B8A4bC0cB",
  [Tokens.SPCX]: "0xe435e8d0803e61383574a488343289f431E98cA7",
  [Tokens.NVDA]: "0x735b4fD026ACA9A6025592b704299253fb6C2a8E",
  [Tokens.NFLX]: "0x6Ef1eCdF3F0F6083911F5462a704640023634752",
  [Tokens.GOOGL]: "0x5E372B77ce32841b55CbD36d5d27aC025F302B09",
  [Tokens.IBM]: "0x2c76Ec8beCcC7916a1f667079373755bA7fDC31c",
  [Tokens.AMD]: "0xD74f26f7E55da4F775D77793D79DDfC6EBe5BEC9",
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
