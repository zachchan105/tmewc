import { context, Environment } from "./context"

import type { BitcoinTransactionHash, Hex } from "@keep-network/tmewc.ts"

const ethTxUrlPrefixMapping = {
  [Environment.Mainnet]: "https://etherscan.io/tx",
  [Environment.Testnet]: "https://sepolia.etherscan.io/tx",
}

export function createEthTxUrl(txHash: Hex) {
  return `${
    ethTxUrlPrefixMapping[context.environment]
  }/${txHash.toPrefixedString()}`
}

const mewcTxUrlPrefixMapping = {
  [Environment.Mainnet]: "https://mempool.space/tx",
  [Environment.Testnet]: "https://mempool.space/testnet/tx",
}

export function createBtcTxUrl(txHash: BitcoinTransactionHash) {
  return `${mewcTxUrlPrefixMapping[context.environment]}/${txHash.toString()}`
}
