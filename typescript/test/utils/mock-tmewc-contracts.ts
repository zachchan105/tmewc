import { TMEWCContracts } from "../../src/lib/contracts"
import { MockBridge } from "./mock-bridge"
import { MockTMEWCToken } from "./mock-tmewc-token"
import { MockTMEWCVault } from "./mock-tmewc-vault"
import { MockWalletRegistry } from "./mock-wallet-registry"

export class MockTMEWCContracts implements TMEWCContracts {
  public readonly bridge: MockBridge
  public readonly tmewcToken: MockTMEWCToken
  public readonly tmewcVault: MockTMEWCVault
  public readonly walletRegistry: MockWalletRegistry

  constructor() {
    this.bridge = new MockBridge()
    this.tmewcToken = new MockTMEWCToken()
    this.tmewcVault = new MockTMEWCVault()
    this.walletRegistry = new MockWalletRegistry()
  }
}
