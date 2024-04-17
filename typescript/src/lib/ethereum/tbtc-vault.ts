import { TMEWCVault as TMEWCVaultTypechain } from "../../../typechain/TMEWCVault"
import {
  GetChainEvents,
  TMEWCVault,
  OptimisticMintingCancelledEvent,
  OptimisticMintingFinalizedEvent,
  OptimisticMintingRequest,
  OptimisticMintingRequestedEvent,
  ChainIdentifier,
  Chains,
} from "../contracts"
import { BigNumber, ContractTransaction } from "ethers"
import { BitcoinTxHash } from "../meowcoin"
import { backoffRetrier, Hex } from "../utils"
import {
  EthersContractConfig,
  EthersContractDeployment,
  EthersContractHandle,
  EthersTransactionUtils,
} from "./adapter"
import { EthereumAddress } from "./address"
import { EthereumBridge } from "./bridge"

import MainnetTMEWCVaultDeployment from "./artifacts/mainnet/TMEWCVault.json"
import SepoliaTMEWCVaultDeployment from "./artifacts/sepolia/TMEWCVault.json"
import LocalTMEWCVaultDeployment from "@keep-network/tmewc/artifacts/TMEWCVault.json"

type ContractOptimisticMintingRequest = {
  requestedAt: BigNumber
  finalizedAt: BigNumber
}

/**
 * Implementation of the Ethereum TMEWCVault handle.
 * @see {TMEWCVault} for reference.
 */
export class EthereumTMEWCVault
  extends EthersContractHandle<TMEWCVaultTypechain>
  implements TMEWCVault
{
  constructor(
    config: EthersContractConfig,
    chainId: Chains.Ethereum = Chains.Ethereum.Local
  ) {
    let deployment: EthersContractDeployment

    switch (chainId) {
      case Chains.Ethereum.Local:
        deployment = LocalTMEWCVaultDeployment
        break
      case Chains.Ethereum.Sepolia:
        deployment = SepoliaTMEWCVaultDeployment
        break
      case Chains.Ethereum.Mainnet:
        deployment = MainnetTMEWCVaultDeployment
        break
      default:
        throw new Error("Unsupported deployment type")
    }

    super(config, deployment)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#getChainIdentifier}
   */
  getChainIdentifier(): ChainIdentifier {
    return EthereumAddress.from(this._instance.address)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#optimisticMintingDelay}
   */
  async optimisticMintingDelay(): Promise<number> {
    const delaySeconds = await backoffRetrier<number>(this._totalRetryAttempts)(
      async () => {
        return await this._instance.optimisticMintingDelay()
      }
    )

    return BigNumber.from(delaySeconds).toNumber()
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#getMinters}
   */
  async getMinters(): Promise<EthereumAddress[]> {
    const minters: string[] = await backoffRetrier<string[]>(
      this._totalRetryAttempts
    )(async () => {
      return await this._instance.getMinters()
    })

    return minters.map(EthereumAddress.from)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#isMinter}
   */
  async isMinter(address: EthereumAddress): Promise<boolean> {
    return await backoffRetrier<boolean>(this._totalRetryAttempts)(async () => {
      return await this._instance.isMinter(`0x${address.identifierHex}`)
    })
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#isGuardian}
   */
  async isGuardian(address: EthereumAddress): Promise<boolean> {
    return await backoffRetrier<boolean>(this._totalRetryAttempts)(async () => {
      return await this._instance.isGuardian(`0x${address.identifierHex}`)
    })
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#requestOptimisticMint}
   */
  async requestOptimisticMint(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<Hex> {
    const tx = await EthersTransactionUtils.sendWithRetry<ContractTransaction>(
      async () => {
        return await this._instance.requestOptimisticMint(
          depositTxHash.reverse().toPrefixedString(),
          depositOutputIndex
        )
      },
      this._totalRetryAttempts,
      undefined,
      [
        "Optimistic minting already requested for the deposit",
        "The deposit is already swept",
      ]
    )

    return Hex.from(tx.hash)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#cancelOptimisticMint}
   */
  async cancelOptimisticMint(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<Hex> {
    const tx = await EthersTransactionUtils.sendWithRetry<ContractTransaction>(
      async () => {
        return await this._instance.cancelOptimisticMint(
          depositTxHash.reverse().toPrefixedString(),
          depositOutputIndex
        )
      },
      this._totalRetryAttempts,
      undefined,
      ["Optimistic minting already finalized for the deposit"]
    )

    return Hex.from(tx.hash)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#finalizeOptimisticMint}
   */
  async finalizeOptimisticMint(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<Hex> {
    const tx = await EthersTransactionUtils.sendWithRetry<ContractTransaction>(
      async () => {
        return await this._instance.finalizeOptimisticMint(
          depositTxHash.reverse().toPrefixedString(),
          depositOutputIndex
        )
      },
      this._totalRetryAttempts,
      undefined,
      [
        "Optimistic minting already finalized for the deposit",
        "The deposit is already swept",
      ]
    )

    return Hex.from(tx.hash)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {TMEWCVault#optimisticMintingRequests}
   */
  async optimisticMintingRequests(
    depositTxHash: BitcoinTxHash,
    depositOutputIndex: number
  ): Promise<OptimisticMintingRequest> {
    const depositKey = EthereumBridge.buildDepositKey(
      depositTxHash,
      depositOutputIndex
    )

    const request: ContractOptimisticMintingRequest =
      await backoffRetrier<ContractOptimisticMintingRequest>(
        this._totalRetryAttempts
      )(async () => {
        return await this._instance.optimisticMintingRequests(depositKey)
      })
    return this.parseOptimisticMintingRequest(request)
  }

  /**
   * Parses a optimistic minting request using data fetched from the on-chain contract.
   * @param request Data of the optimistic minting request.
   * @returns Parsed optimistic minting request.
   */
  private parseOptimisticMintingRequest(
    request: ContractOptimisticMintingRequest
  ): OptimisticMintingRequest {
    return {
      requestedAt: BigNumber.from(request.requestedAt).toNumber(),
      finalizedAt: BigNumber.from(request.finalizedAt).toNumber(),
    }
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {ChainBridge#getOptimisticMintingRequestedEvents}
   */
  async getOptimisticMintingRequestedEvents(
    options?: GetChainEvents.Options,
    ...filterArgs: Array<any>
  ): Promise<OptimisticMintingRequestedEvent[]> {
    const events = await this.getEvents(
      "OptimisticMintingRequested",
      options,
      ...filterArgs
    )

    return events.map<OptimisticMintingRequestedEvent>((event) => {
      return {
        blockNumber: BigNumber.from(event.blockNumber).toNumber(),
        blockHash: Hex.from(event.blockHash),
        transactionHash: Hex.from(event.transactionHash),
        minter: EthereumAddress.from(event.args!.minter),
        depositKey: Hex.from(
          BigNumber.from(event.args!.depositKey).toHexString()
        ),
        depositor: EthereumAddress.from(event.args!.depositor),
        amount: BigNumber.from(event.args!.amount),
        fundingTxHash: BitcoinTxHash.from(event.args!.fundingTxHash).reverse(),
        fundingOutputIndex: BigNumber.from(
          event.args!.fundingOutputIndex
        ).toNumber(),
      }
    })
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {ChainBridge#getOptimisticMintingCancelledEvents}
   */
  async getOptimisticMintingCancelledEvents(
    options?: GetChainEvents.Options,
    ...filterArgs: Array<any>
  ): Promise<OptimisticMintingCancelledEvent[]> {
    const events = await this.getEvents(
      "OptimisticMintingCancelled",
      options,
      ...filterArgs
    )

    return events.map<OptimisticMintingCancelledEvent>((event) => {
      return {
        blockNumber: BigNumber.from(event.blockNumber).toNumber(),
        blockHash: Hex.from(event.blockHash),
        transactionHash: Hex.from(event.transactionHash),
        guardian: EthereumAddress.from(event.args!.guardian),
        depositKey: Hex.from(
          BigNumber.from(event.args!.depositKey).toHexString()
        ),
      }
    })
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {ChainBridge#getOptimisticMintingFinalizedEvents}
   */
  async getOptimisticMintingFinalizedEvents(
    options?: GetChainEvents.Options,
    ...filterArgs: Array<any>
  ): Promise<OptimisticMintingFinalizedEvent[]> {
    const events = await this.getEvents(
      "OptimisticMintingFinalized",
      options,
      ...filterArgs
    )

    return events.map<OptimisticMintingFinalizedEvent>((event) => {
      return {
        blockNumber: BigNumber.from(event.blockNumber).toNumber(),
        blockHash: Hex.from(event.blockHash),
        transactionHash: Hex.from(event.transactionHash),
        minter: EthereumAddress.from(event.args!.minter),
        depositKey: Hex.from(
          BigNumber.from(event.args!.depositKey).toHexString()
        ),
        depositor: EthereumAddress.from(event.args!.depositor),
        optimisticMintingDebt: BigNumber.from(
          event.args!.optimisticMintingDebt
        ),
      }
    })
  }
}
