import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Tokenized-equity mocks to deploy on testnet, each with its own
// MockV3Aggregator price feed (8 decimals, Chainlink USD-feed convention).
// initialPriceUsd8 is the starting price scaled to 1e8 (e.g. $189.50 -> 18950000000).
const STOCKS = [
  {
    symbol: "AAPL",
    decimals: 18,
    collateralFactorBps: 7500, // 75.0% LTV
    liquidationThresholdBps: 8000, // 80.0% Threshold
    liquidationPenaltyBps: 500, // 5.0% Penalty (<= 15%)
    liquidationBonusBps: 400, // 4.0% Bonus (<= Penalty)
    maxExposure: "10000000000000000000000000", // 10,000,000 shares
    name: "Robinhood AAPL",
    initialPriceUsd8: "18950000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "AMZN",
    decimals: 18,
    collateralFactorBps: 7000, // 70.0% LTV
    liquidationThresholdBps: 7500, // 75.0% Threshold
    liquidationPenaltyBps: 700, // 7.0% Penalty
    liquidationBonusBps: 500, // 5.0% Bonus
    maxExposure: "10000000000000000000000000", // 10,000,000 shares
    name: "Robinhood AMZN",
    initialPriceUsd8: "18600000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "TSLA",
    decimals: 18,
    collateralFactorBps: 5500, // 55.0% LTV (Higher Volatility)
    liquidationThresholdBps: 6200, // 62.0% Threshold
    liquidationPenaltyBps: 1200, // 12.0% Penalty
    liquidationBonusBps: 1000, // 10.0% Bonus
    maxExposure: "5000000000000000000000000", // 5,000,000 shares
    name: "Robinhood TSLA",
    initialPriceUsd8: "24500000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "SPCX",
    decimals: 18,
    collateralFactorBps: 5000, // 50.0% LTV (Higher Volatility / Niche)
    liquidationThresholdBps: 5800, // 58.0% Threshold
    liquidationPenaltyBps: 1400, // 14.0% Penalty
    liquidationBonusBps: 1200, // 12.0% Bonus
    maxExposure: "5000000000000000000000000", // 5,000,000 shares
    name: "Robinhood SPCX",
    initialPriceUsd8: "5000000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "NVDA",
    decimals: 18,
    collateralFactorBps: 6800, // 68.0% LTV
    liquidationThresholdBps: 7300, // 73.0% Threshold
    liquidationPenaltyBps: 800, // 8.0% Penalty
    liquidationBonusBps: 600, // 6.0% Bonus
    maxExposure: "10000000000000000000000000", // 10,000,000 shares
    name: "Robinhood NVDA",
    initialPriceUsd8: "13500000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "NFLX",
    decimals: 18,
    collateralFactorBps: 6500, // 65.0% LTV
    liquidationThresholdBps: 7000, // 70.0% Threshold
    liquidationPenaltyBps: 900, // 9.0% Penalty
    liquidationBonusBps: 700, // 7.0% Bonus
    maxExposure: "10000000000000000000000000", // 10,000,000 shares
    name: "Robinhood NFLX",
    initialPriceUsd8: "70000000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "GOOGL",
    decimals: 18,
    collateralFactorBps: 7500, // 75.0% LTV
    liquidationThresholdBps: 8000, // 80.0% Threshold
    liquidationPenaltyBps: 500, // 5.0% Penalty
    liquidationBonusBps: 400, // 4.0% Bonus
    maxExposure: "10000000000000000000000000", // 10,000,000 shares
    name: "Robinhood GOOGL",
    initialPriceUsd8: "17500000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
  {
    symbol: "IBM",
    decimals: 18,
    collateralFactorBps: 7200, // 72.0% LTV
    liquidationThresholdBps: 7700, // 77.0% Threshold
    liquidationPenaltyBps: 600, // 6.0% Penalty
    liquidationBonusBps: 500, // 5.0% Bonus
    maxExposure: "10000000000000000000000000", // 10,000,000 shares
    name: "Robinhood IBM",
    initialPriceUsd8: "22000000000",
    initialSupply: "10000000000000000000000000", // 10,000,000 shares
  },
];

const FEED_DECIMALS = 8;
const STALENESS_THRESHOLD = 3600; // 1 hour; must be within [1 minutes, 24 hours]

export default buildModule("CredditProtocol", (m) => {
  // ---------------------------------------------------------------------
  // Parameters (override per network via --parameters ignition/parameters.json)
  // ---------------------------------------------------------------------
  const admin = m.getParameter("admin", m.getAccount(0));

  const USDG_NAME = m.getParameter("usdgName", "USD Global");
  const USDG_SYMBOL = m.getParameter("usdgSymbol", "USDG");
  const USDG_DECIMALS = 6; // stablecoin convention, matches USDC/USDT
  const USDG_INITIAL_SUPPLY = m.getParameter(
    "usdgInitialSupply",
    "200000000000000", // 200,000,000 USDG at 6 decimals
  );

  const usdg = m.contract(
    "MockERC20",
    [USDG_NAME, USDG_SYMBOL, USDG_DECIMALS, admin],
    { id: "UsdgToken" },
  );

  m.call(usdg, "mint", [admin, USDG_INITIAL_SUPPLY], {
    id: "UsdgMintInitialSupply",
  });

  m.contract("MockV3Aggregator", [FEED_DECIMALS, "100000000"], {
    id: `UsdgFeed`,
  });

  const rateModelParams = m.getParameter("rateModelParams", [
    "20000000000000000", // baseRateWad: 2%
    "800000000000000000", // kinkWad: 80%
    "40000000000000000", // slope1Wad: 4%
    "750000000000000000", // slope2Wad: 75%
  ]);

  const riskParams = {
    creditUtilizationCapWad: m.getParameter(
      "creditUtilizationCapWad",
      "900000000000000000", // 90%
    ),
    maxCollateralAssetsPerUser: m.getParameter(
      "maxCollateralAssetsPerUser",
      10,
    ),
    liquidationCloseFactorWad: m.getParameter(
      "liquidationCloseFactorWad",
      "500000000000000000", // 50%
    ),
  };

  // ---------------------------------------------------------------------
  // 1. CredditInterestRateModel (UUPS via ERC1967Proxy)
  // ---------------------------------------------------------------------
  const rateModelImpl = m.contract("CredditInterestRateModel", [], {
    id: "RateModelImpl",
  });
  const rateModelInitData = m.encodeFunctionCall(rateModelImpl, "initialize", [
    admin,
    rateModelParams,
  ]);
  const rateModelProxy = m.contract(
    "ERC1967Proxy",
    [rateModelImpl, rateModelInitData],
    { id: "RateModelProxy" },
  );
  const rateModel = m.contractAt("CredditInterestRateModel", rateModelProxy, {
    id: "RateModel",
  });

  // ---------------------------------------------------------------------
  // 2. CredditLiquidityPool — depends on rateModel
  // ---------------------------------------------------------------------
  const poolName = m.getParameter("poolName", "Creddit USDG");
  const poolSymbol = m.getParameter("poolSymbol", "cUSDG");

  const poolImpl = m.contract("CredditLiquidityPool", [], { id: "PoolImpl" });
  const poolInitData = m.encodeFunctionCall(poolImpl, "initialize", [
    usdg,
    poolName,
    poolSymbol,
    admin,
    rateModel,
  ]);
  const poolProxy = m.contract("ERC1967Proxy", [poolImpl, poolInitData], {
    id: "PoolProxy",
  });
  const pool = m.contractAt("CredditLiquidityPool", poolProxy, {
    id: "Pool",
  });

  // ---------------------------------------------------------------------
  // 3. CredditOracle (independent)
  // ---------------------------------------------------------------------
  const oracleImpl = m.contract("CredditOracle", [], { id: "OracleImpl" });
  const oracleInitData = m.encodeFunctionCall(oracleImpl, "initialize", [
    admin,
  ]);
  const oracleProxy = m.contract("ERC1967Proxy", [oracleImpl, oracleInitData], {
    id: "OracleProxy",
  });
  const oracle = m.contractAt("CredditOracle", oracleProxy, { id: "Oracle" });

  // ---------------------------------------------------------------------
  // 4. CredditAssetRegistry (independent)
  // ---------------------------------------------------------------------
  const registryImpl = m.contract("CredditAssetRegistry", [], {
    id: "RegistryImpl",
  });
  const registryInitData = m.encodeFunctionCall(registryImpl, "initialize", [
    admin,
  ]);
  const registryProxy = m.contract(
    "ERC1967Proxy",
    [registryImpl, registryInitData],
    { id: "RegistryProxy" },
  );
  const registry = m.contractAt("CredditAssetRegistry", registryProxy, {
    id: "Registry",
  });

  // ---------------------------------------------------------------------
  // 5. CredditRiskEngine — depends on registry + oracle
  // ---------------------------------------------------------------------
  const riskEngineImpl = m.contract("CredditRiskEngine", [], {
    id: "RiskEngineImpl",
  });
  const riskEngineInitData = m.encodeFunctionCall(
    riskEngineImpl,
    "initialize",
    [
      admin,
      registry,
      oracle,
      riskParams.creditUtilizationCapWad,
      riskParams.maxCollateralAssetsPerUser,
      riskParams.liquidationCloseFactorWad,
    ],
  );
  const riskEngineProxy = m.contract(
    "ERC1967Proxy",
    [riskEngineImpl, riskEngineInitData],
    { id: "RiskEngineProxy" },
  );
  const riskEngine = m.contractAt("CredditRiskEngine", riskEngineProxy, {
    id: "RiskEngine",
  });

  // ---------------------------------------------------------------------
  // 6. CredditLendingRouter — depends on usdg only
  // ---------------------------------------------------------------------
  const routerImpl = m.contract("CredditLendingRouter", [], {
    id: "RouterImpl",
  });
  const routerInitData = m.encodeFunctionCall(routerImpl, "initialize", [
    admin,
    usdg,
  ]);
  const routerProxy = m.contract("ERC1967Proxy", [routerImpl, routerInitData], {
    id: "RouterProxy",
  });
  const router = m.contractAt("CredditLendingRouter", routerProxy, {
    id: "Router",
  });

  // ---------------------------------------------------------------------
  // 7. CredditCreditLine — depends on registry, usdg, riskEngine, oracle, router
  // ---------------------------------------------------------------------
  const creditLineImpl = m.contract("CredditCreditLine", [], {
    id: "CreditLineImpl",
  });
  const creditLineInitData = m.encodeFunctionCall(
    creditLineImpl,
    "initialize",
    [admin, registry, usdg, riskEngine, oracle, router],
  );
  const creditLineProxy = m.contract(
    "ERC1967Proxy",
    [creditLineImpl, creditLineInitData],
    { id: "CreditLineProxy" },
  );
  const creditLine = m.contractAt("CredditCreditLine", creditLineProxy, {
    id: "CreditLine",
  });

  // ---------------------------------------------------------------------
  // Wiring — cross-contract role grants / registrations.
  // ---------------------------------------------------------------------
  m.call(pool, "setRouter", [router], { id: "PoolSetRouter" });
  m.call(router, "setAdapter", [pool, true], { id: "RouterSetAdapter" });
  m.call(router, "setCreditLine", [creditLine], {
    id: "RouterSetCreditLine",
  });

  // ---------------------------------------------------------------------
  // 8. Mock tokenized-equity collateral (testnet only): one MockERC20 +
  // one MockV3Aggregator per stock, wired into the oracle and registry.
  // ---------------------------------------------------------------------
  const stockTokens: Record<string, unknown> = {};
  const stockFeeds: Record<string, unknown> = {};

  for (const stock of STOCKS) {
    const token = m.contract(
      "MockERC20",
      [stock.name, stock.symbol, stock.decimals, admin],
      { id: `${stock.symbol}Token` },
    );

    m.call(token, "mint", [admin, stock.initialSupply], {
      id: `${stock.symbol}MintInitialSupply`,
    });

    const feed = m.contract(
      "MockV3Aggregator",
      [FEED_DECIMALS, stock.initialPriceUsd8],
      { id: `${stock.symbol}Feed` },
    );

    m.call(oracle, "setFeed", [feed, token, STALENESS_THRESHOLD], {
      id: `OracleSetFeed${stock.symbol}`,
    });

    m.call(
      registry,
      "addAsset",
      [
        token,
        stock.collateralFactorBps,
        stock.liquidationThresholdBps,
        stock.liquidationPenaltyBps,
        stock.liquidationBonusBps,
        stock.maxExposure,
        stock.decimals,
      ],
      { id: `RegistryAddAsset${stock.symbol}` },
    );

    stockTokens[stock.symbol] = token;
    stockFeeds[stock.symbol] = feed;
  }

  return {
    rateModel,
    rateModelProxy,
    pool,
    poolProxy,
    oracle,
    oracleProxy,
    registry,
    registryProxy,
    riskEngine,
    riskEngineProxy,
    router,
    routerProxy,
    creditLine,
    creditLineProxy,
    ...stockTokens,
    ...Object.fromEntries(
      Object.entries(stockFeeds).map(([symbol, feed]) => [
        `${symbol}Feed`,
        feed,
      ]),
    ),
  };
});
