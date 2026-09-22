import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin, hardhatVerify],
  solidity: {
    profiles: {
      default: {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
    npmFilesToBuild: ["@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol"],
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    robinhood: {
      type: "http",
      chainType: "l1",
      url: configVariable("RH_RPC_URL"),
      chainId: 4663,
      accounts: [configVariable("RH_PRIVATE_KEY")],
    },
    robinhoodTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("RH_TESTNET_RPC_URL"),
      chainId: 46630,
      accounts: [configVariable("RH_TESTNET_PRIVATE_KEY")],
    },
  },
});
