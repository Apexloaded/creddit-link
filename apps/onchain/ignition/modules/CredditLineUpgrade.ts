import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js"; // Import main module to reference proxy address

export default buildModule("CredditLineUpgrade", (m) => {
  // Import the existing contracts from the base deployment module
  const { creditLineProxy } = m.useModule(CredditProtocolModule);

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

  return {
    newCreditLineImpl,
    creditLine,
  };
});
