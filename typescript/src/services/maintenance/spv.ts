import {
  assembleBitcoinSpvProof,
  BitcoinClient,
  BitcoinTxHash,
  BitcoinUtxo,
  extractBitcoinRawTxVectors,
} from "../../lib/meowcoin"
import { Hex } from "../../lib/utils"
import { ChainIdentifier, TMEWCContracts } from "../../lib/contracts"

export class Spv {
  /**
   * Handle to tMEWC contracts.
   */
  private readonly tmewcContracts: TMEWCContracts
  /**
   * Meowcoin client handle.
   */
  private readonly bitcoinClient: BitcoinClient

  constructor(tmewcContracts: TMEWCContracts, bitcoinClient: BitcoinClient) {
    this.tmewcContracts = tmewcContracts
    this.bitcoinClient = bitcoinClient
  }

  /**
   * Prepares the proof of a deposit sweep transaction and submits it to the
   * Bridge on-chain contract.
   * @param transactionHash - Hash of the transaction being proven.
   * @param mainUtxo - Recent main UTXO of the wallet as currently known on-chain.
   * @param vault - (Optional) The vault pointed by swept deposits.
   * @returns Empty promise.
   */
  async submitDepositSweepProof(
    transactionHash: BitcoinTxHash,
    mainUtxo: BitcoinUtxo,
    vault?: ChainIdentifier
  ): Promise<void> {
    const confirmations =
      await this.tmewcContracts.bridge.txProofDifficultyFactor()
    const proof = await assembleBitcoinSpvProof(
      transactionHash,
      confirmations,
      this.bitcoinClient
    )
    const rawTransaction = await this.bitcoinClient.getRawTransaction(
      transactionHash
    )
    const rawTransactionVectors = extractBitcoinRawTxVectors(rawTransaction)
    await this.tmewcContracts.bridge.submitDepositSweepProof(
      rawTransactionVectors,
      proof,
      mainUtxo,
      vault
    )
  }

  /**
   * Prepares the proof of a redemption transaction and submits it to the
   * Bridge on-chain contract.
   * @param transactionHash - Hash of the transaction being proven.
   * @param mainUtxo - Recent main UTXO of the wallet as currently known on-chain.
   * @param walletPublicKey - Meowcoin public key of the wallet. Must be in the
   *        compressed form (33 bytes long with 02 or 03 prefix).
   * @returns Empty promise.
   */
  async submitRedemptionProof(
    transactionHash: BitcoinTxHash,
    mainUtxo: BitcoinUtxo,
    walletPublicKey: Hex
  ): Promise<void> {
    const confirmations =
      await this.tmewcContracts.bridge.txProofDifficultyFactor()
    const proof = await assembleBitcoinSpvProof(
      transactionHash,
      confirmations,
      this.bitcoinClient
    )
    const rawTransaction = await this.bitcoinClient.getRawTransaction(
      transactionHash
    )
    const rawTransactionVectors = extractBitcoinRawTxVectors(rawTransaction)

    await this.tmewcContracts.bridge.submitRedemptionProof(
      rawTransactionVectors,
      proof,
      mainUtxo,
      walletPublicKey
    )
  }
}
