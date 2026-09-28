import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js"; // Import main module to reference proxy address

export default buildModule("CredditOracleUpgradeModule", (m) => {
  // 1. Fetch the existing proxy address deployed in CredditProtocol
  const {
    creditLineProxy,
    poolProxy,
    routerProxy,
    riskEngineProxy,
    oracleProxy,
    registryProxy,
  } = m.useModule(CredditProtocolModule);

  // 2. Deploy the new implementation bytecode compiled from updated CredditOracle.sol
  const newCreditLineImpl = m.contract("CredditCreditLine");
  const newCredditRouterImpl = m.contract("CredditLendingRouter");
  const newCredditLiquidityPoolImpl = m.contract("CredditLiquidityPool");
  const newRiskEngineImpl = m.contract("CredditRiskEngine");
  const newOracleImpl = m.contract("CredditOracle");
  const newRegistryImpl = m.contract("CredditAssetRegistry")

  // 3. Attach to the existing Proxy using the updated ABI
  const creditLineAtProxy = m.contractAt("CredditCreditLine", creditLineProxy, {
    id: "CredditCreditLineProxyInterface",
  });
  const routerAtProxy = m.contractAt("CredditLendingRouter", routerProxy, {
    id: "CredditLendingRouterProxyInterface",
  });
  const liquidityPoolAtProxy = m.contractAt("CredditLiquidityPool", poolProxy, {
    id: "CredditLiquidityPoolProxyInterface",
  });
  const riskEngineAtProxy = m.contractAt("CredditRiskEngine", riskEngineProxy, {
    id: "CredditRiskEngineProxyInterface",
  });
  const oracleAtProxy = m.contractAt("CredditOracle", oracleProxy, {
    id: "CredditOracleProxyInterface",
  });
  const registryAtProxy = m.contractAt("CredditAssetRegistry", registryProxy, {
    id: "CredditAssetRegistryProxyInterface",
  });

  // 4. Point the proxy to the new implementation
  m.call(creditLineAtProxy, "upgradeToAndCall", [newCreditLineImpl, "0x"]);
  m.call(routerAtProxy, "upgradeToAndCall", [newCredditRouterImpl, "0x"]);
  m.call(liquidityPoolAtProxy, "upgradeToAndCall", [
    newCredditLiquidityPoolImpl,
    "0x",
  ]);
  m.call(riskEngineAtProxy, "upgradeToAndCall", [newRiskEngineImpl, "0x"]);
  m.call(oracleAtProxy, "upgradeToAndCall", [newOracleImpl, "0x"]);
  m.call(registryAtProxy, "upgradeToAndCall", [newRegistryImpl, "0x"]);

  return {
    creditLineProxy,
    newCreditLineImpl,
    poolProxy,
    newCredditLiquidityPoolImpl,
    routerProxy,
    newCredditRouterImpl,
    riskEngineProxy,
    newRiskEngineImpl,
    oracleProxy,
    newOracleImpl,
    registryProxy,
    newRegistryImpl
  };
});
