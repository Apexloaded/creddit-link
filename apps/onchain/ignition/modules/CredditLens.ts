import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredditProtocolModule from "./CredditProtocol.js"; // Import main module to reference proxy address

export default buildModule("CredditLensModule", (m) => {
  // 1. Fetch the existing proxy address deployed in CredditProtocol
  const {
    creditLine, pool,
  } = m.useModule(CredditProtocolModule);
  const credditLens = m.contract("CredditLens", [creditLine, pool], {
    id: "CredditLensImpl",
  });
  return { credditLens };
});
