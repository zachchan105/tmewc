export * from "./bridge"
export * from "./chain"
export * from "./chain-event"
export * from "./chain-identifier"
export * from "./cross-chain"
export * from "./depositor-proxy"
export * from "./tmewc-token"
export * from "./tmewc-vault"
export * from "./wallet-registry"

import { Bridge } from "./bridge"
import { TMEWCToken } from "./tmewc-token"
import { TMEWCVault } from "./tmewc-vault"
import { WalletRegistry } from "./wallet-registry"

/**
 * Convenience type aggregating all TMEWC core contracts.
 */
export type TMEWCContracts = {
  bridge: Bridge
  tmewcToken: TMEWCToken
  tmewcVault: TMEWCVault
  walletRegistry: WalletRegistry
}
