import { TMEWC as TMEWCTypechain } from "../../../typechain/TMEWC"
import { ChainIdentifier, Chains, TMEWCToken } from "../contracts"
import { BigNumber, ContractTransaction, utils } from "ethers"
import { BitcoinHashUtils, BitcoinUtxo } from "../meowcoin"
import { Hex } from "../utils"
import {
  EthersContractConfig,
  EthersContractDeployment,
  EthersContractHandle,
  EthersTransactionUtils,
} from "./adapter"
import { EthereumAddress } from "./address"

import MainnetTMEWCTokenDeployment from "./artifacts/mainnet/TMEWC.json"
import SepoliaTMEWCTokenDeployment from "./artifacts/sepolia/TMEWC.json"
import LocalTMEWCTokenDeployment from "@zachchan105/tmewc/artifacts/TMEWC.json"

/**
 * Implementation of the Ethereum TMEWC token handle.
 * @see {TMEWCToken} for reference.
 */
export class EthereumTMEWCToken
  extends EthersContractHandle<TMEWCTypechain>
  implements TMEWCToken
{
  constructor(
    config: EthersContractConfig,
    chainId: Chains.Ethereum = Chains.Ethereum.Local
  ) {
    let deployment: EthersContractDeployment

    switch (chainId) {
      case Chains.Ethereum.Local:
        deployment = LocalTMEWCTokenDeployment
        break
      case Chains.Ethereum.Sepolia:
        deployment = SepoliaTMEWCTokenDeployment
        break
      case Chains.Ethereum.Mainnet:
        deployment = MainnetTMEWCTokenDeployment
        break
      default:
        throw new Error("Unsupported deployment type")
    }

    super(config, deployment)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCToken#getChainIdentifier}
   */
  getChainIdentifier(): ChainIdentifier {
    return EthereumAddress.from(this._instance.address)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCToken#totalSupply}
   */
  async totalSupply(blockNumber?: number): Promise<BigNumber> {
    return this._instance.totalSupply({
      blockTag: blockNumber ?? "latest",
    })
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCToken#requestRedemption}
   */
  async requestRedemption(
    walletPublicKey: Hex,
    mainUtxo: BitcoinUtxo,
    redeemerOutputScript: Hex,
    amount: BigNumber
  ): Promise<Hex> {
    const redeemer = await this._instance?.signer?.getAddress()
    if (!redeemer) {
      throw new Error("Signer not provided")
    }

    const vault = await this._instance.owner()
    const extraData = this.buildRequestRedemptionData(
      EthereumAddress.from(redeemer),
      walletPublicKey,
      mainUtxo,
      redeemerOutputScript
    )

    const tx = await EthersTransactionUtils.sendWithRetry<ContractTransaction>(
      async () => {
        return await this._instance.approveAndCall(
          vault,
          amount,
          extraData.toPrefixedString()
        )
      },
      this._totalRetryAttempts
    )

    return Hex.from(tx.hash)
  }

  private buildRequestRedemptionData(
    redeemer: EthereumAddress,
    walletPublicKey: Hex,
    mainUtxo: BitcoinUtxo,
    redeemerOutputScript: Hex
  ): Hex {
    const {
      walletPublicKeyHash,
      prefixedRawRedeemerOutputScript,
      mainUtxo: _mainUtxo,
    } = this.buildBridgeRequestRedemptionData(
      walletPublicKey,
      mainUtxo,
      redeemerOutputScript
    )

    return Hex.from(
      utils.defaultAbiCoder.encode(
        ["address", "bytes20", "bytes32", "uint32", "uint64", "bytes"],
        [
          redeemer.identifierHex,
          walletPublicKeyHash,
          _mainUtxo.txHash,
          _mainUtxo.txOutputIndex,
          _mainUtxo.txOutputValue,
          prefixedRawRedeemerOutputScript,
        ]
      )
    )
  }

  private buildBridgeRequestRedemptionData(
    walletPublicKey: Hex,
    mainUtxo: BitcoinUtxo,
    redeemerOutputScript: Hex
  ) {
    const walletPublicKeyHash =
      BitcoinHashUtils.computeHash160(walletPublicKey).toPrefixedString()

    const mainUtxoParam = {
      // The Ethereum Bridge expects this hash to be in the Meowcoin internal
      // byte order.
      txHash: mainUtxo.transactionHash.reverse().toPrefixedString(),
      txOutputIndex: mainUtxo.outputIndex,
      txOutputValue: mainUtxo.value,
    }

    // Convert the output script to raw bytes buffer.
    const rawRedeemerOutputScript = redeemerOutputScript.toBuffer()
    // Prefix the output script bytes buffer with 0x and its own length.
    const prefixedRawRedeemerOutputScript = `0x${Buffer.concat([
      Buffer.from([rawRedeemerOutputScript.length]),
      rawRedeemerOutputScript,
    ]).toString("hex")}`

    return {
      walletPublicKeyHash,
      mainUtxo: mainUtxoParam,
      prefixedRawRedeemerOutputScript,
    }
  }
}
