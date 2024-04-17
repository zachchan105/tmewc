import { BitcoinTxHash } from "../../lib/meowcoin"
import { OptimisticMintingRequest } from "../../lib/contracts"
import { Hex } from "../../lib/utils"
import { TMEWCContracts } from "../../lib/contracts"

export class OptimisticMinting {
  private readonly tmewcContracts: TMEWCContracts

  constructor(tmewcContracts: TMEWCContracts) {
    this.tmewcContracts = tmewcContracts
  }

  /**
   * Requests optimistic minting for a deposit on chain.
   * @param depositTxHash The revealed deposit transaction's hash.
   * @param depositOutputIndex Index of the deposit transaction output that
   *        funds the revealed deposit.
   * @returns Transaction hash of the optimistic mint request transaction.
   */
  async requestMint(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<Hex> {
    return this.tmewcContracts.tmewcVault.requestOptimisticMint(
      depositTxHash,
      depositOutputIndex
    )
  }

  /**
   * Cancels optimistic minting for a deposit on chain.
   * @param depositTxHash The revealed deposit transaction's hash.
   * @param depositOutputIndex Index of the deposit transaction output that
   *        funds the revealed deposit.
   * @returns Transaction hash of the optimistic mint cancel transaction.
   */
  async cancelMint(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<Hex> {
    return this.tmewcContracts.tmewcVault.cancelOptimisticMint(
      depositTxHash,
      depositOutputIndex
    )
  }

  /**
   * Finalizes optimistic minting for a deposit on chain.
   * @param depositTxHash The revealed deposit transaction's hash.
   * @param depositOutputIndex Index of the deposit transaction output that
   *        funds the revealed deposit.
   * @returns Transaction hash of the optimistic mint finalize transaction.
   */
  async finalizeMint(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<Hex> {
    return this.tmewcContracts.tmewcVault.finalizeOptimisticMint(
      depositTxHash,
      depositOutputIndex
    )
  }

  /**
   * Gets optimistic minting request for a deposit from chain.
   * @param depositTxHash The revealed deposit transaction's hash.
   * @param depositOutputIndex Index of the deposit transaction output that
   *        funds the revealed deposit.
   * @returns Optimistic minting request.
   */
  async getMintingRequest(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<OptimisticMintingRequest> {
    return this.tmewcContracts.tmewcVault.optimisticMintingRequests(
      depositTxHash,
      depositOutputIndex
    )
  }
}
