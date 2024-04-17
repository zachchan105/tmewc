import type { HardhatUserConfig } from "hardhat/config"

import "@nomiclabs/hardhat-etherscan"
import "@zachchan105/hardhat-helpers"
import "@nomiclabs/hardhat-waffle"
import "hardhat-gas-reporter"
import "hardhat-contract-sizer"
import "hardhat-deploy"
import "@typechain/hardhat"
import "hardhat-dependency-compiler"

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },

  paths: {
    artifacts: "./build",
  },

  networks: {
    hardhat: {
      deploy: [
        // "deploy_parentchain",
        "deploy_sidechain",
      ],
    },
    goerli: {
      url: process.env.PARENTCHAIN_API_URL || "",
      chainId: 5,
      deploy: ["deploy_parentchain"],
      accounts: process.env.PARENTCHAIN_ACCOUNTS_PRIVATE_KEYS
        ? process.env.PARENTCHAIN_ACCOUNTS_PRIVATE_KEYS.split(",")
        : undefined,
      tags: ["etherscan"],
    },
    mainnet: {
      url: process.env.PARENTCHAIN_API_URL || "",
      chainId: 1,
      deploy: ["deploy_parentchain"],
      accounts: process.env.PARENTCHAIN_ACCOUNTS_PRIVATE_KEYS
        ? process.env.PARENTCHAIN_ACCOUNTS_PRIVATE_KEYS.split(",")
        : undefined,
      tags: ["etherscan"],
    },
    mumbai: {
      url: process.env.SIDECHAIN_API_URL || "",
      chainId: 80001,
      deploy: ["deploy_sidechain"],
      accounts: process.env.SIDECHAIN_ACCOUNTS_PRIVATE_KEYS
        ? process.env.SIDECHAIN_ACCOUNTS_PRIVATE_KEYS.split(",")
        : undefined,
      tags: ["polygonscan"],
      // companionNetworks: {
      //   parentchain: "goerli",
      // },
    },
    polygon: {
      url: process.env.SIDECHAIN_API_URL || "",
      chainId: 137,
      deploy: ["deploy_sidechain"],
      accounts: process.env.SIDECHAIN_ACCOUNTS_PRIVATE_KEYS
        ? process.env.SIDECHAIN_ACCOUNTS_PRIVATE_KEYS.split(",")
        : undefined,
      tags: ["polygonscan"],
      // companionNetworks: {
      //   parentchain: "mainnet",
      // },
    },
  },

  external: {
    deployments: {
      goerli: ["./external/goerli"],
      mainnet: ["./external/mainnet"],
      mumbai: ["./external/mumbai"],
      polygon: ["./external/polygon"],
    },
  },

  deploymentArtifactsExport: {
    goerli: "artifacts/parentchain",
    mainnet: "artifacts/parentchain",
    mumbai: "artifacts/sidechain",
    polygon: "artifacts/sidechain",
  },

  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
    },
  },

  namedAccounts: {
    deployer: {
      default: 1,
      goerli: 0,
      mumbai: 0,
      mainnet: "0x123694886DBf5Ac94DDA07135349534536D14cAf",
      polygon: "0x123694886DBf5Ac94DDA07135349534536D14cAf",
    },
    governance: {
      default: 2,
      goerli: 0,
      mumbai: 0,
      mainnet: "0x9f6e831c8f8939dc0c830c6e492e7cef4f9c2f5f",
      polygon: "0x9f6e831c8f8939dc0c830c6e492e7cef4f9c2f5f",
    },
  },
  mocha: {
    timeout: 60_000,
  },
  typechain: {
    outDir: "typechain",
  },
}

export default config
