import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js"; // Import main module to reference proxy address

export default buildModule("CredditOracleUpgrade", (m) => {
  // Import the existing contracts from the base deployment module
  const { creditLineProxy, routerProxy, credditLensProxy } = m.useModule(
    CredditProtocolModule,
  );

  // 1. Deploy and upgrade CredditCreditLine
  const newCreditLineImpl = m.contract("CredditCreditLine", [], {
    id: "NewCreditLineImpl",
  });
  const creditLine = m.contractAt("CredditCreditLine", creditLineProxy, {
    id: "CreditLineProxyForUpgrade",
  });
  m.call(creditLine, "upgradeToAndCall", [newCreditLineImpl, "0x"], {
    id: "UpgradeCreditLine",
  });

  // 2. Deploy and upgrade CredditLendingRouter
  const newRouterImpl = m.contract("CredditLendingRouter", [], {
    id: "NewRouterImpl",
  });
  const router = m.contractAt("CredditLendingRouter", routerProxy, {
    id: "RouterProxyForUpgrade",
  });
  m.call(router, "upgradeToAndCall", [newRouterImpl, "0x"], {
    id: "UpgradeLendingRouter",
  });

  // 3. Deploy and upgrade CredditLens
  const newLensImpl = m.contract("CredditLens", [], {
    id: "NewLensImpl",
  });
  const credditLens = m.contractAt("CredditLens", credditLensProxy, {
    id: "LensProxyForUpgrade",
  });
  m.call(credditLens, "upgradeToAndCall", [newLensImpl, "0x"], {
    id: "UpgradeCredditLens",
  });

  return {
    newCreditLineImpl,
    newRouterImpl,
    newLensImpl,
    creditLine,
    router,
    credditLens,
  };
});
