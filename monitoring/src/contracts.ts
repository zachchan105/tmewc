import {
  EthereumBridge,
  EthereumTMEWCToken,
  EthereumTMEWCVault,
} from "@keep-network/tmewc.ts"
import { providers } from "ethers"

import { context, Environment } from "./context"

import type {
  Bridge,
  TMEWCVault,
  TMEWCToken,
} from "@keep-network/tmewc.ts/dist/src/chain"

const resolve = () => {
  let packageName: string

  switch (context.environment) {
    case Environment.Mainnet: {
      packageName = "@keep-network/tmewc-mainnet"
      break
    }
    case Environment.Testnet: {
      packageName = "@keep-network/tmewc-testnet"
      break
    }
    default: {
      throw new Error(
        `cannot pick tmewc package for ${context.environment} environment`
      )
    }
  }

  const provider = new providers.JsonRpcProvider(context.ethereumUrl)

  const latestBlock = async () => {
    const block = await provider.getBlock("latest")
    return block.number
  }

  const blockTimestamp = async (blockNumber: number): Promise<number> => {
    const block = await provider.getBlock(blockNumber)
    return block.timestamp
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require
  const bridgeArtifact = require(`${packageName}/artifacts/Bridge.json`)
  const bridge: Bridge = new EthereumBridge({
    address: bridgeArtifact.address,
    signerOrProvider: provider,
    deployedAtBlockNumber: bridgeArtifact.receipt.blockNumber,
  })

  // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require
  const tmewcVaultArtifact = require(`${packageName}/artifacts/TMEWCVault.json`)
  const tmewcVault: TMEWCVault = new EthereumTMEWCVault({
    address: tmewcVaultArtifact.address,
    signerOrProvider: provider,
    deployedAtBlockNumber: tmewcVaultArtifact.receipt.blockNumber,
  })

  // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require
  const tmewcTokenArtifact = require(`${packageName}/artifacts/TMEWC.json`)
  const tmewcToken: TMEWCToken = new EthereumTMEWCToken({
    address: tmewcTokenArtifact.address,
    signerOrProvider: provider,
    deployedAtBlockNumber: tmewcTokenArtifact.receipt.blockNumber,
  })

  return { bridge, tmewcVault, tmewcToken, latestBlock, blockTimestamp }
}

export const contracts = resolve()
