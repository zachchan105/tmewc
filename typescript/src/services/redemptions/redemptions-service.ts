import {
  RedemptionRequest,
  TMEWCContracts,
  WalletState,
} from "../../lib/contracts"
import {
  BitcoinAddressConverter,
  BitcoinClient,
  BitcoinNetwork,
  BitcoinScriptUtils,
  BitcoinTxOutput,
  BitcoinUtxo,
} from "../../lib/meowcoin"
import { BigNumber } from "ethers"
import { Hex } from "../../lib/utils"

/**
 * Service exposing features related to tMEWC redemptions.
 */
export class RedemptionsService {
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
   * Requests a redemption of TMEWC token into MEWC.
   * @param bitcoinRedeemerAddress Meowcoin address redeemed MEWC should be
   *                               sent to. Only P2PKH, P2WPKH, P2SH, and P2WSH
   *                               address types are supported.
   * @param amount The amount to be redeemed with the precision of the tMEWC
   *        on-chain token contract.
   * @returns Object containing:
   *          - Target chain hash of the request redemption transaction
   *            (for example, Ethereum transaction hash)
   *          - Meowcoin public key of the wallet asked to handle the redemption.
   *            Presented in the compressed form (33 bytes long with 02 or 03 prefix).
   */
  async requestRedemption(
    bitcoinRedeemerAddress: string,
    amount: BigNumber
  ): Promise<{
    targetChainTxHash: Hex
    walletPublicKey: Hex
  }> {
    const bitcoinNetwork = await this.bitcoinClient.getNetwork()

    const redeemerOutputScript = BitcoinAddressConverter.addressToOutputScript(
      bitcoinRedeemerAddress,
      bitcoinNetwork
    )
    if (
      !BitcoinScriptUtils.isP2PKHScript(redeemerOutputScript) &&
      !BitcoinScriptUtils.isP2WPKHScript(redeemerOutputScript) &&
      !BitcoinScriptUtils.isP2SHScript(redeemerOutputScript) &&
      !BitcoinScriptUtils.isP2WSHScript(redeemerOutputScript)
    ) {
      throw new Error("Redeemer output script must be of standard type")
    }

    const amountToSatoshi = (value: BigNumber): BigNumber => {
      const satoshiMultiplier = BigNumber.from(1e10)
      const remainder = value.mod(satoshiMultiplier)
      const convertibleAmount = amount.sub(remainder)
      return convertibleAmount.div(satoshiMultiplier)
    }

    // The findWalletForRedemption operates on satoshi amount precision (1e8)
    // while the amount parameter is TMEWC token precision (1e18). We need to
    // convert the amount to get proper results.
    const { walletPublicKey, mainUtxo } = await this.findWalletForRedemption(
      redeemerOutputScript,
      amountToSatoshi(amount)
    )

    const txHash = await this.tmewcContracts.tmewcToken.requestRedemption(
      walletPublicKey,
      mainUtxo,
      redeemerOutputScript,
      amount
    )

    return {
      targetChainTxHash: txHash,
      walletPublicKey,
    }
  }

  /**
   * Finds the oldest live wallet that has enough MEWC to handle a redemption
   * request.
   * @param redeemerOutputScript The redeemer output script the redeemed funds are
   *        supposed to be locked on. Must not be prepended with length.
   * @param amount The amount to be redeemed in satoshis.
   * @returns Promise with the wallet details needed to request a redemption.
   */
  protected async findWalletForRedemption(
    redeemerOutputScript: Hex,
    amount: BigNumber
  ): Promise<{
    walletPublicKey: Hex
    mainUtxo: BitcoinUtxo
  }> {
    const wallets =
      await this.tmewcContracts.bridge.getNewWalletRegisteredEvents()

    let walletData:
      | {
          walletPublicKey: Hex
          mainUtxo: BitcoinUtxo
        }
      | undefined = undefined
    let maxAmount = BigNumber.from(0)
    let liveWalletsCounter = 0

    const bitcoinNetwork = await this.bitcoinClient.getNetwork()

    for (const wallet of wallets) {
      const { walletPublicKeyHash } = wallet
      const { state, walletPublicKey, pendingRedemptionsValue } =
        await this.tmewcContracts.bridge.wallets(walletPublicKeyHash)

      // Wallet must be in Live state.
      if (state !== WalletState.Live) {
        console.debug(
          `Wallet is not in Live state ` +
            `(wallet public key hash: ${walletPublicKeyHash.toString()}). ` +
            `Continue the loop execution to the next wallet...`
        )
        continue
      }
      liveWalletsCounter++

      // Wallet must have a main UTXO that can be determined.
      const mainUtxo = await this.determineWalletMainUtxo(
        walletPublicKeyHash,
        bitcoinNetwork
      )
      if (!mainUtxo) {
        console.debug(
          `Could not find matching UTXO on chains ` +
            `for wallet public key hash (${walletPublicKeyHash.toString()}). ` +
            `Continue the loop execution to the next wallet...`
        )
        continue
      }

      const pendingRedemption =
        await this.tmewcContracts.bridge.pendingRedemptions(
          walletPublicKey,
          redeemerOutputScript
        )

      if (pendingRedemption.requestedAt != 0) {
        console.debug(
          `There is a pending redemption request from this wallet to the ` +
            `same Meowcoin address. Given wallet public key hash` +
            `(${walletPublicKeyHash.toString()}) and redeemer output script ` +
            `(${redeemerOutputScript.toString()}) pair can be used for only one ` +
            `pending request at the same time. ` +
            `Continue the loop execution to the next wallet...`
        )
        continue
      }

      const walletMEWCBalance = mainUtxo.value.sub(pendingRedemptionsValue)

      // Save the max possible redemption amount.
      maxAmount = walletMEWCBalance.gt(maxAmount) ? walletMEWCBalance : maxAmount

      if (walletMEWCBalance.gte(amount)) {
        walletData = {
          walletPublicKey,
          mainUtxo,
        }

        break
      }

      console.debug(
        `The wallet (${walletPublicKeyHash.toString()})` +
          `cannot handle the redemption request. ` +
          `Continue the loop execution to the next wallet...`
      )
    }

    if (liveWalletsCounter === 0) {
      throw new Error("Currently, there are no live wallets in the network.")
    }

    // Cover a corner case when the user requested redemption for all live wallets
    // in the network using the same Meowcoin address.
    if (!walletData && liveWalletsCounter > 0 && maxAmount.eq(0)) {
      throw new Error(
        "All live wallets in the network have the pending redemption for a given Meowcoin address. " +
          "Please use another Meowcoin address."
      )
    }

    if (!walletData)
      throw new Error(
        `Could not find a wallet with enough funds. Maximum redemption amount is ${maxAmount} Satoshi.`
      )

    return walletData
  }

  /**
   * Determines the plain-text wallet main UTXO currently registered in the
   * Bridge on-chain contract. The returned main UTXO can be undefined if the
   * wallet does not have a main UTXO registered in the Bridge at the moment.
   * @param walletPublicKeyHash - Public key hash of the wallet.
   * @param bitcoinNetwork - Meowcoin network.
   * @returns Promise holding the wallet main UTXO or undefined value.
   */
  protected async determineWalletMainUtxo(
    walletPublicKeyHash: Hex,
    bitcoinNetwork: BitcoinNetwork
  ): Promise<BitcoinUtxo | undefined> {
    const { mainUtxoHash } = await this.tmewcContracts.bridge.wallets(
      walletPublicKeyHash
    )

    // Valid case when the wallet doesn't have a main UTXO registered into
    // the Bridge.
    if (
      mainUtxoHash.equals(
        Hex.from(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        )
      )
    ) {
      return undefined
    }

    // The wallet main UTXO registered in the Bridge almost always comes
    // from the latest MEWC transaction made by the wallet. However, there may
    // be cases where the MEWC transaction was made but their SPV proof is
    // not yet submitted to the Bridge thus the registered main UTXO points
    // to the second last MEWC transaction. In theory, such a gap between
    // the actual latest MEWC transaction and the registered main UTXO in
    // the Bridge may be even wider. To cover the worst possible cases, we
    // must rely on the full transaction history. Due to performance reasons,
    // we are first taking just the transactions hashes (fast call) and then
    // fetch full transaction data (time-consuming calls) starting from
    // the most recent transactions as there is a high chance the main UTXO
    // comes from there.
    const walletTxHashes = await this.bitcoinClient.getTxHashesForPublicKeyHash(
      walletPublicKeyHash
    )

    const getOutputScript = (witness: boolean): Hex => {
      const address = BitcoinAddressConverter.publicKeyHashToAddress(
        walletPublicKeyHash,
        witness,
        bitcoinNetwork
      )
      return BitcoinAddressConverter.addressToOutputScript(
        address,
        bitcoinNetwork
      )
    }

    const walletP2PKH = getOutputScript(false)
    const walletP2WPKH = getOutputScript(true)

    const isWalletOutput = (output: BitcoinTxOutput) =>
      walletP2PKH.equals(output.scriptPubKey) ||
      walletP2WPKH.equals(output.scriptPubKey)

    // Start iterating from the latest transaction as the chance it matches
    // the wallet main UTXO is the highest.
    for (let i = walletTxHashes.length - 1; i >= 0; i--) {
      const walletTxHash = walletTxHashes[i]
      const walletTransaction = await this.bitcoinClient.getTransaction(
        walletTxHash
      )

      // Find the output that locks the funds on the wallet. Only such an output
      // can be a wallet main UTXO.
      const outputIndex = walletTransaction.outputs.findIndex(isWalletOutput)

      // Should never happen as all transactions come from wallet history. Just
      // in case check whether the wallet output was actually found.
      if (outputIndex < 0) {
        console.error(
          `wallet output for transaction ${walletTransaction.transactionHash.toString()} not found`
        )
        continue
      }

      // Build a candidate UTXO instance based on the detected output.
      const utxo: BitcoinUtxo = {
        transactionHash: walletTransaction.transactionHash,
        outputIndex: outputIndex,
        value: walletTransaction.outputs[outputIndex].value,
      }

      // Check whether the candidate UTXO hash matches the main UTXO hash stored
      // on the Bridge.
      if (mainUtxoHash.equals(this.tmewcContracts.bridge.buildUtxoHash(utxo))) {
        return utxo
      }
    }

    // Should never happen if the wallet has the main UTXO registered in the
    // Bridge. It could only happen due to some serious error, e.g. wrong main
    // UTXO hash stored in the Bridge or Meowcoin blockchain data corruption.
    console.error(
      `main UTXO with hash ${mainUtxoHash.toPrefixedString()} not found for wallet ${walletPublicKeyHash.toString()}`
    )
    return undefined
  }

  /**
   * Gets data of a registered redemption request from the Bridge contract.
   * @param bitcoinRedeemerAddress Meowcoin redeemer address used to request
   *                               the redemption.
   * @param walletPublicKey Meowcoin public key of the wallet handling the
   *                        redemption. Must be in the compressed form
   *                        (33 bytes long with 02 or 03 prefix).
   * @param type Type of redemption requests the function will look for. Can be
   *        either `pending` or `timedOut`. By default, `pending` is used.
   * @returns Matching redemption requests.
   * @throws Throws an error if no redemption request exists for the given
   *         input parameters.
   */
  async getRedemptionRequests(
    bitcoinRedeemerAddress: string,
    walletPublicKey: Hex,
    type: "pending" | "timedOut" = "pending"
  ): Promise<RedemptionRequest> {
    const bitcoinNetwork = await this.bitcoinClient.getNetwork()

    const redeemerOutputScript = BitcoinAddressConverter.addressToOutputScript(
      bitcoinRedeemerAddress,
      bitcoinNetwork
    )

    let redemptionRequest: RedemptionRequest | undefined = undefined

    switch (type) {
      case "pending": {
        redemptionRequest = await this.tmewcContracts.bridge.pendingRedemptions(
          walletPublicKey,
          redeemerOutputScript
        )
        break
      }
      case "timedOut": {
        redemptionRequest = await this.tmewcContracts.bridge.timedOutRedemptions(
          walletPublicKey,
          redeemerOutputScript
        )
        break
      }
      default: {
        throw new Error("Unsupported redemption request type")
      }
    }

    if (!redemptionRequest || redemptionRequest.requestedAt == 0) {
      throw new Error("Redemption request does not exist")
    }

    return redemptionRequest
  }
}
