import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js";

// Option A: Change the module ID (e.g., CredditLineUpgradeV2)
export default buildModule("CredditLineUpgradeV2", (m) => {
  const { creditLineProxy } = m.useModule(CredditProtocolModule);

  // Option B: Change individual step IDs
  const newCreditLineImpl = m.contract("CredditCreditLine", [], {
    id: "NewCreditLineImplV2", // Updated ID
  });

  const creditLine = m.contractAt("CredditCreditLine", creditLineProxy, {
    id: "CreditLineProxyForUpgradeV2", // Updated ID
  });

  m.call(creditLine, "upgradeToAndCall", [newCreditLineImpl, "0x"], {
    id: "UpgradeCreditLineV2", // Updated ID
  });

  return {
    newCreditLineImpl,
    creditLine,
  };
});
