import { ChainIdentifier } from "./chain-identifier"
import { BigNumber } from "ethers"
import { ChainMapping, L2Chain } from "./chain"
import { BitcoinRawTxVectors } from "../meowcoin"
import { DepositReceipt } from "./bridge"
import { Hex } from "../utils"

/**
 * Convenience type aggregating TMEWC cross-chain contracts forming a connector
 * between TMEWC L1 ledger chain and a specific supported L2/side-chain.
 */
export type CrossChainContracts = L2CrossChainContracts & L1CrossChainContracts

/**
 * Aggregates L2-specific TMEWC cross-chain contracts.
 */
export type L2CrossChainContracts = {
  l2TmewcToken: L2TMEWCToken
  l2BitcoinDepositor: L2BitcoinDepositor
}

/**
 * Aggregates L1-specific TMEWC cross-chain contracts.
 */
export type L1CrossChainContracts = {
  l1BitcoinDepositor: L1BitcoinDepositor
}

/**
 * Interface for loading TMEWC cross-chain contracts for a specific L2 chain.
 * It should be implemented for each supported L1 chain tMEWC ledger is deployed
 * on.
 */
export interface CrossChainContractsLoader {
  /**
   * Loads the chain mapping based on underlying L1 chain.
   */
  loadChainMapping: () => ChainMapping | undefined
  /**
   * Loads L1-specific TMEWC cross-chain contracts for the given L2 chain.
   * @param l2ChainName Name of the L2 chain for which to load L1 contracts.
   */
  loadL1Contracts: (l2ChainName: L2Chain) => Promise<L1CrossChainContracts>
}

/**
 * Interface for communication with the on-chain contract of the given
 * canonical L2 tMEWC token.
 */
export interface L2TMEWCToken {
  /**
   * Gets the chain-specific identifier of this contract.
   */
  getChainIdentifier(): ChainIdentifier

  /**
   * Returns the balance of the given identifier.
   * @param identifier Identifier of the account to get the balance for.
   * @returns The balance of the given identifier in 1e18 precision.
   */
  balanceOf(identifier: ChainIdentifier): Promise<BigNumber>
}

/**
 * Interface for communication with the L2BitcoinDepositor on-chain contract
 * deployed on the given L2 chain.
 */
export interface L2BitcoinDepositor {
  /**
   * Gets the chain-specific identifier of this contract.
   */
  getChainIdentifier(): ChainIdentifier

  /**
   * Gets the identifier that should be used as the owner of the deposits
   * issued by this contract.
   * @returns The identifier of the deposit owner or undefined if not set.
   */
  getDepositOwner(): ChainIdentifier | undefined

  /**
   * Sets the identifier that should be used as the owner of the deposits
   * issued by this contract.
   * @param depositOwner Identifier of the deposit owner or undefined to clear.
   */
  setDepositOwner(depositOwner: ChainIdentifier): void

  /**
   * @returns Extra data encoder for this contract. The encoder is used to
   * encode and decode the extra data included in the cross-chain deposit script.
   */
  extraDataEncoder(): CrossChainExtraDataEncoder

  /**
   * Initializes the cross-chain deposit indirectly through the given L2 chain.
   * @param depositTx Deposit transaction data
   * @param depositOutputIndex Index of the deposit transaction output that
   *        funds the revealed deposit
   * @param deposit Data of the revealed deposit
   * @param vault Optional parameter denoting the vault the given deposit
   *        should be routed to
   * @returns Transaction hash of the reveal deposit transaction.
   */
  initializeDeposit(
    depositTx: BitcoinRawTxVectors,
    depositOutputIndex: number,
    deposit: DepositReceipt,
    vault?: ChainIdentifier
  ): Promise<Hex>
}

/**
 * Interface for communication with the L1BitcoinDepositor on-chain contract
 * specific to the given L2 chain, deployed on the L1 chain.
 */
export interface L1BitcoinDepositor {
  /**
   * Gets the chain-specific identifier of this contract.
   */
  getChainIdentifier(): ChainIdentifier

  /**
   * @returns Extra data encoder for this contract. The encoder is used to
   * encode and decode the extra data included in the cross-chain deposit script.
   */
  extraDataEncoder(): CrossChainExtraDataEncoder

  /**
   * Initializes the cross-chain deposit directly on the given L1 chain.
   * @param depositTx Deposit transaction data
   * @param depositOutputIndex Index of the deposit transaction output that
   *        funds the revealed deposit
   * @param deposit Data of the revealed deposit
   * @param vault Optional parameter denoting the vault the given deposit
   *        should be routed to
   * @returns Transaction hash of the reveal deposit transaction.
   */
  initializeDeposit(
    depositTx: BitcoinRawTxVectors,
    depositOutputIndex: number,
    deposit: DepositReceipt,
    vault?: ChainIdentifier
  ): Promise<Hex>
}

/**
 * Interface for encoding and decoding the extra data included in the
 * cross-chain deposit script.
 */
export interface CrossChainExtraDataEncoder {
  /**
   * Encodes the given deposit owner identifier into the extra data.
   * @param depositOwner Identifier of the deposit owner to encode.
   *        For cross-chain deposits, the deposit owner is typically an
   *        identifier on the L2 chain.
   * @returns Encoded extra data.
   */
  encodeDepositOwner(depositOwner: ChainIdentifier): Hex

  /**
   * Decodes the extra data into the deposit owner identifier.
   * @param extraData Extra data to decode.
   * @returns Identifier of the deposit owner.
   */
  decodeDepositOwner(extraData: Hex): ChainIdentifier
}
