import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CredditLensModule", (m) => {
  const credditLine = "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f"
  const credditLens = m.contract("CredditLens", [credditLine], {
    id: "CredditLensImpl",
  });
  return { credditLens };
});
