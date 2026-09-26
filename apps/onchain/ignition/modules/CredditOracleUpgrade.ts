import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js";// Import main module to reference proxy address

export default buildModule("CredditOracleUpgradeModule", (m) => {
  // 1. Fetch the existing proxy address deployed in CredditProtocol
  const { oracleProxy, creditLineProxy, riskEngineProxy } = m.useModule(CredditProtocolModule);

  // 2. Deploy the new implementation bytecode compiled from updated CredditOracle.sol
  const newOracleImpl = m.contract("CredditOracle");
  const newCreditLineImpl = m.contract("CredditCreditLine");
  const newRiskEngineImpl = m.contract("CredditRiskEngine");

  // 3. Attach to the existing Proxy using the updated ABI
  const oracleAtProxy = m.contractAt("CredditOracle", oracleProxy, { id: "CredditOracleProxyInterface" });
  const creditLineAtProxy = m.contractAt("CredditCreditLine", creditLineProxy, { id: "CredditCreditLineProxyInterface" });
  const riskEngineAtProxy = m.contractAt("CredditRiskEngine", riskEngineProxy, { id: "CredditRiskEngineProxyInterface" });

  // 4. Point the proxy to the new implementation
  m.call(oracleAtProxy, "upgradeToAndCall", [newOracleImpl, "0x"]);
  m.call(creditLineAtProxy, "upgradeToAndCall", [newCreditLineImpl, "0x"]);
  m.call(riskEngineAtProxy, "upgradeToAndCall", [newRiskEngineImpl, "0x"]);

  return { oracleProxy, newOracleImpl, creditLineProxy, newCreditLineImpl, riskEngineProxy, newRiskEngineImpl };
});