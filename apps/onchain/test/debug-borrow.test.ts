import { network } from "hardhat";

const { ethers } = await network.create({
  network: "localhost",
});

console.log("Sending transaction using the OP chain type");
async function main() {
  const [sender] = await ethers.getSigners();

  const pool = await ethers.getContractAt(
    "CredditCreditLine",
    "0x9f730950454fF3c8300156212221c1741bc6C7c2"
  );

  // staticCall simulates the call without broadcasting or gas estimation
  await pool.borrow.staticCall(BigInt(10000000000));
}

main().catch((error) => {
  console.error("EXACT REVERT ERROR:\n", error);
  process.exitCode = 1;
});