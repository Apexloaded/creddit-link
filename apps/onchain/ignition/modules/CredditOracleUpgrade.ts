import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js";

export default buildModule("CredditOracleUpgradeModule", (m) => {
  // 1. Fetch existing proxies and contracts from main module
  const {
    creditLineProxy,
    poolProxy,
    routerProxy,
    riskEngineProxy,
    oracleProxy,
    registryProxy,
    creditLine,
    pool,
  } = m.useModule(CredditProtocolModule);

  // 2. Deploy new implementation contract
  const newCreditLineImpl = m.contract("CredditCreditLine");

  // 3. Attach ABI interface to the existing Proxy
  const creditLineAtProxy = m.contractAt("CredditCreditLine", creditLineProxy, {
    id: "CredditCreditLineProxyInterface",
  });

  // 4. Deploy CredditLens referencing the proxy contract future and pool
  const credditLens = m.contract("CredditLens", [creditLine, pool], {
    id: "CredditLensImpl",
  });

  // 5. Call upgradeToAndCall on UUPS or Transparent Proxy
  // Note: Pass "0x" as string or empty byte representation depending on contract expectations
  m.call(creditLineAtProxy, "upgradeToAndCall", [newCreditLineImpl, "0x"]);

  return {
    creditLineProxy,
    newCreditLineImpl,
    credditLens,
    poolProxy,
    routerProxy,
    riskEngineProxy,
    oracleProxy,
    registryProxy,
  };
});