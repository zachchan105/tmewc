import { TMEWCContracts } from "../../lib/contracts"
import { BitcoinClient } from "../../lib/meowcoin"
import { OptimisticMinting } from "./optimistic-minting"
import { Spv } from "./spv"

/**
 * Service exposing features relevant to authorized maintainers and
 * operators of the tMEWC system.
 */
export class MaintenanceService {
  /**
   * Features for optimistic minting maintainers.
   */
  public readonly optimisticMinting: OptimisticMinting
  /**
   * Features for SPV proof maintainers.
   */
  public readonly spv: Spv

  constructor(tmewcContracts: TMEWCContracts, bitcoinClient: BitcoinClient) {
    this.optimisticMinting = new OptimisticMinting(tmewcContracts)
    this.spv = new Spv(tmewcContracts, bitcoinClient)
  }
}
