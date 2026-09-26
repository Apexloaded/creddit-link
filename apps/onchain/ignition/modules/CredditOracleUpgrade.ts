import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js";// Import main module to reference proxy address

export default buildModule("CredditOracleUpgradeModule", (m) => {
  // 1. Fetch the existing proxy address deployed in CredditProtocol
  const { creditLineProxy, poolProxy } = m.useModule(CredditProtocolModule);

  // 2. Deploy the new implementation bytecode compiled from updated CredditOracle.sol
  const newCreditLineImpl = m.contract("CredditCreditLine");
  const newCredditLiquidityPoolImpl = m.contract("CredditLiquidityPool");

  // 3. Attach to the existing Proxy using the updated ABI
  const creditLineAtProxy = m.contractAt("CredditCreditLine", creditLineProxy, { id: "CredditCreditLineProxyInterface" });
  const liquidityPoolAtProxy = m.contractAt("CredditLiquidityPool", poolProxy, { id: "CredditLiquidityPoolProxyInterface" });

  // 4. Point the proxy to the new implementation
  m.call(creditLineAtProxy, "upgradeToAndCall", [newCreditLineImpl, "0x"]);
  m.call(liquidityPoolAtProxy, "upgradeToAndCall", [newCredditLiquidityPoolImpl, "0x"]);

  return { creditLineProxy, newCreditLineImpl, poolProxy, newCredditLiquidityPoolImpl };
});