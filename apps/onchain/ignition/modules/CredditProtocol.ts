import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Tokenized-equity mocks to deploy on testnet, each with its own
// MockV3Aggregator price feed (8 decimals, Chainlink USD-feed convention).
// initialPriceUsd8 is the starting price scaled to 1e8 (e.g. $189.50 -> 18950000000).
const STOCKS = [
  { symbol: "AAPL", name: "Robinhood AAPL", initialPriceUsd8: "18950000000" },
  { symbol: "AMZN", name: "Robinhood AMZN", initialPriceUsd8: "18600000000" },
  { symbol: "TSLA", name: "Robinhood TSLA", initialPriceUsd8: "24500000000" },
  { symbol: "SPCX", name: "Robinhood SPCX", initialPriceUsd8: "5000000000" },
  { symbol: "NVDA", name: "Robinhood NVDA", initialPriceUsd8: "13500000000" },
  { symbol: "NFLX", name: "Robinhood NFLX", initialPriceUsd8: "70000000000" },
  { symbol: "GOOGL", name: "Robinhood GOOGL", initialPriceUsd8: "17500000000" },
  { symbol: "IBM", name: "Robinhood IBM", initialPriceUsd8: "22000000000" },
];

const FEED_DECIMALS = 8;
const TOKEN_DECIMALS = 18;
const STALENESS_THRESHOLD = 3600; // 1 hour; must be within [1 minutes, 24 hours]

// Placeholder collateral risk params, shared across all 8 tokens here.
// collateralFactorBps + 500 <= liquidationThresholdBps is enforced on-chain.
const COLLATERAL_FACTOR_BPS = 6500; // 65%
const LIQUIDATION_THRESHOLD_BPS = 7000; // 70%
const LIQUIDATION_PENALTY_BPS = 800; // 8%
const LIQUIDATION_BONUS_BPS = 500; // 5%
const MAX_EXPOSURE = "1000000000000000000000000"; // 1,000,000 tokens (18 decimals)

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
    "100000000000000" // 100,000,000 USDG at 6 decimals
  );

  const usdg = m.contract(
    "MockERC20",
    [USDG_NAME, USDG_SYMBOL, USDG_DECIMALS, admin],
    { id: "UsdgToken" }
  );
  m.call(usdg, "mint", [admin, USDG_INITIAL_SUPPLY], {
    id: "UsdgMintInitialSupply",
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
      "900000000000000000" // 90%
    ),
    maxCollateralAssetsPerUser: m.getParameter(
      "maxCollateralAssetsPerUser",
      10
    ),
    liquidationCloseFactorWad: m.getParameter(
      "liquidationCloseFactorWad",
      "500000000000000000" // 50%
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
    { id: "RateModelProxy" }
  );
  const rateModel = m.contractAt(
    "CredditInterestRateModel",
    rateModelProxy,
    { id: "RateModel" }
  );

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
    { id: "RegistryProxy" }
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
    ]
  );
  const riskEngineProxy = m.contract(
    "ERC1967Proxy",
    [riskEngineImpl, riskEngineInitData],
    { id: "RiskEngineProxy" }
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
  const routerProxy = m.contract(
    "ERC1967Proxy",
    [routerImpl, routerInitData],
    { id: "RouterProxy" }
  );
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
    [admin, registry, usdg, riskEngine, oracle, router]
  );
  const creditLineProxy = m.contract(
    "ERC1967Proxy",
    [creditLineImpl, creditLineInitData],
    { id: "CreditLineProxy" }
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
      [stock.name, stock.symbol, TOKEN_DECIMALS, admin],
      { id: `${stock.symbol}Token` }
    );

    const feed = m.contract(
      "MockV3Aggregator",
      [FEED_DECIMALS, stock.initialPriceUsd8],
      { id: `${stock.symbol}Feed` }
    );

    m.call(oracle, "setFeed", [feed, token, STALENESS_THRESHOLD], {
      id: `OracleSetFeed${stock.symbol}`,
    });

    m.call(
      registry,
      "addAsset",
      [
        token,
        COLLATERAL_FACTOR_BPS,
        LIQUIDATION_THRESHOLD_BPS,
        LIQUIDATION_PENALTY_BPS,
        LIQUIDATION_BONUS_BPS,
        MAX_EXPOSURE,
        TOKEN_DECIMALS,
      ],
      { id: `RegistryAddAsset${stock.symbol}` }
    );

    stockTokens[stock.symbol] = token;
    stockFeeds[stock.symbol] = feed;
  }

  return {
    rateModel,
    pool,
    oracle,
    registry,
    riskEngine,
    router,
    creditLine,
    ...stockTokens,
    ...Object.fromEntries(
      Object.entries(stockFeeds).map(([symbol, feed]) => [`${symbol}Feed`, feed])
    ),
  };
});