import { OptimisticMinting } from "@keep-network/tmewc.ts"

import { SystemEventType } from "./system-event"

import type {
  OptimisticMintingCancelledEvent as OptimisticMintingCancelledChainEvent,
  OptimisticMintingRequestedEvent as OptimisticMintingRequestedChainEvent,
  OptimisticMintingFinalizedEvent as OptimisticMintingFinalizedChainEvent,
} from "@keep-network/tmewc.ts/dist/src/optimistic-minting"
import type { DepositRevealedEvent as DepositRevealedChainEvent } from "@keep-network/tmewc.ts/dist/src/deposit"
import type {
  Bridge,
  Identifier,
  TMEWCVault,
} from "@keep-network/tmewc.ts/dist/src/chain"
import type { Client as BitcoinClient } from "@keep-network/tmewc.ts/dist/src/meowcoin"
import type { BitcoinTransactionHash } from "@keep-network/tmewc.ts"
import type { SystemEvent, Monitor as SystemEventMonitor } from "./system-event"
import type { BigNumber } from "ethers"

const satoshiMultiplier = 1e10

// Number of blocks the monitor gives for minters to create a minting
// request for the given deposit, counted from the deposit reveal block.
// The value is 2 hours which is 600 blocks assuming 12 seconds for ETH block.
// This value aims to include:
// - worst case 6 MEWC confirmations of the deposit, i.e. ~60 min assuming
//   10 min for MEWC block
// - 20 minutes of the designated minter precedence period
// - 40 minutes of additional margin
const mintingRequestTimeoutBlocks = 600

// Number of blocks the monitor gives for minters to finalize the
// minting request, counted from the minting request block.
// The value is the current optimistic minting delay plus 1 hour, converted
// to blocks assuming 12 seconds for ETH block. The value aims to include:
// - optimistic minting delay
// - 20 minutes of the designated minter precedence period
// - 40 minutes of additional margin
const mintingFinalizationTimeoutBlocks = (optimisticMintingDelay: number) =>
  optimisticMintingDelay / 12 + 300

const OptimisticMintingCancelled = (
  chainEvent: OptimisticMintingCancelledChainEvent
): SystemEvent => ({
  title: "Optimistic minting cancelled",
  type: SystemEventType.Warning,
  data: {
    guardian: `0x${chainEvent.guardian.identifierHex}`,
    depositKey: chainEvent.depositKey.toPrefixedString(),
    ethCancelTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

const OptimisticMintingRequestedTooEarly = (
  chainEvent: OptimisticMintingRequestedChainEvent,
  mewcFundingTxActualConfirmations: number,
  mewcFundingTxRequiredConfirmations: number
): SystemEvent => ({
  title: "Optimistic minting requested too early",
  type: SystemEventType.Critical,
  data: {
    minter: `0x${chainEvent.minter.identifierHex}`,
    depositKey: chainEvent.depositKey.toPrefixedString(),
    depositor: `0x${chainEvent.depositor.identifierHex}`,
    amountSat: chainEvent.amount.div(satoshiMultiplier).toString(),
    mewcFundingTxHash: chainEvent.fundingTxHash.toString(),
    mewcFundingOutputIndex: chainEvent.fundingOutputIndex.toString(),
    mewcFundingTxActualConfirmations: mewcFundingTxActualConfirmations.toString(),
    mewcFundingTxRequiredConfirmations:
      mewcFundingTxRequiredConfirmations.toString(),
    ethRequestTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

// This event is raised in case one can't determine the confirmations count
// for the given deposit funding transaction pointed by the OM request.
// We cannot determine the exact cause. Example cases are:
// - A problem with the MEWC client that doesn't handle requests properly
// - Deliberate behavior of the used client implementation that
//   throws in case of a non-existing MEWC transaction. Such a case may indicate
//   an evil minter that requested OM for non-existing funding transaction.
// That said, the monitoring should warn about it and force the on-call
// person to investigate the problem.
const OptimisticMintingRequestedForUndeterminedBtcTx = (
  chainEvent: OptimisticMintingRequestedChainEvent,
  mewcClientResponse: string
): SystemEvent => ({
  title: "Optimistic minting requested for undetermined Meowcoin transaction",
  type: SystemEventType.Critical,
  data: {
    minter: `0x${chainEvent.minter.identifierHex}`,
    depositKey: chainEvent.depositKey.toPrefixedString(),
    depositor: `0x${chainEvent.depositor.identifierHex}`,
    amountSat: chainEvent.amount.div(satoshiMultiplier).toString(),
    mewcFundingTxHash: chainEvent.fundingTxHash.toString(),
    mewcFundingOutputIndex: chainEvent.fundingOutputIndex.toString(),
    mewcClientResponse,
    ethRequestTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

const OptimisticMintingNotRequestedByDesignatedMinter = (
  chainEvent: OptimisticMintingRequestedChainEvent,
  designatedMinter: Identifier
): SystemEvent => ({
  title: "Optimistic minting not requested by designated minter",
  type: SystemEventType.Warning,
  data: {
    actualMinter: `0x${chainEvent.minter.identifierHex}`,
    designatedMinter: `0x${designatedMinter.identifierHex}`,
    depositKey: chainEvent.depositKey.toPrefixedString(),
    depositor: `0x${chainEvent.depositor.identifierHex}`,
    amountSat: chainEvent.amount.div(satoshiMultiplier).toString(),
    mewcFundingTxHash: chainEvent.fundingTxHash.toString(),
    mewcFundingOutputIndex: chainEvent.fundingOutputIndex.toString(),
    ethRequestTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

const OptimisticMintingNotFinalizedByDesignatedMinter = (
  chainEvent: OptimisticMintingFinalizedChainEvent,
  designatedMinter: Identifier | "unknown",
  designatedMinterUnknownCause: string
): SystemEvent => ({
  title: "Optimistic minting not finalized by designated minter",
  type: SystemEventType.Warning,
  data: {
    actualMinter: `0x${chainEvent.minter.identifierHex}`,
    designatedMinter:
      designatedMinter === "unknown"
        ? "unknown"
        : `0x${designatedMinter.identifierHex}`,
    designatedMinterUnknownCause:
      designatedMinter === "unknown" ? designatedMinterUnknownCause : "n/a",
    depositKey: chainEvent.depositKey.toPrefixedString(),
    depositor: `0x${chainEvent.depositor.identifierHex}`,
    ethFinalizationTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

const OptimisticMintingNotRequestedByAnyMinter = (
  chainEvent: DepositRevealedChainEvent
): SystemEvent => ({
  title: "Optimistic minting not requested by any minter",
  type: SystemEventType.Warning,
  data: {
    mewcFundingTxHash: chainEvent.fundingTxHash.toString(),
    mewcFundingOutputIndex: chainEvent.fundingOutputIndex.toString(),
    amountSat: chainEvent.amount.toString(),
    ethRevealTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

const OptimisticMintingNotFinalizedByAnyMinter = (
  chainEvent: OptimisticMintingRequestedChainEvent
): SystemEvent => ({
  title: "Optimistic minting not finalized by any minter",
  type: SystemEventType.Warning,
  data: {
    mewcFundingTxHash: chainEvent.fundingTxHash.toString(),
    mewcFundingOutputIndex: chainEvent.fundingOutputIndex.toString(),
    amountSat: chainEvent.amount.toString(),
    ethRequestTxHash: chainEvent.transactionHash.toPrefixedString(),
  },
  block: chainEvent.blockNumber,
})

// Cache that holds some chain data relevant for the minting monitor.
// Allows fetching the data once and reusing them multiple times across the monitor.
type ChainDataCache = {
  mintingCancelledEvents: OptimisticMintingCancelledChainEvent[]
  mintingRequestedEvents: OptimisticMintingRequestedChainEvent[]
  mintingFinalizedEvents: OptimisticMintingFinalizedChainEvent[]
  minters: Identifier[]
  optimisticMintingDelay: number
}

export class MintingMonitor implements SystemEventMonitor {
  private bridge: Bridge

  private tmewcVault: TMEWCVault

  private mewcClient: BitcoinClient

  constructor(bridge: Bridge, tmewcVault: TMEWCVault, mewcClient: BitcoinClient) {
    this.bridge = bridge
    this.tmewcVault = tmewcVault
    this.mewcClient = mewcClient
  }

  async check(fromBlock: number, toBlock: number): Promise<SystemEvent[]> {
    // eslint-disable-next-line no-console
    console.log("running minting monitor check")

    const cache = await this.loadChainDataCache(fromBlock, toBlock)

    const systemEvents: SystemEvent[] = []
    systemEvents.push(...this.checkMintingCancels(cache))
    systemEvents.push(...(await this.checkMintingRequestsValidity(cache)))
    systemEvents.push(...(await this.checkDesignatedMintersHealth(cache)))
    systemEvents.push(
      ...(await this.checkOrphanedMinting(cache, fromBlock, toBlock))
    )

    // eslint-disable-next-line no-console
    console.log("completed minting monitor check")

    return systemEvents
  }

  private async loadChainDataCache(
    fromBlock: number,
    toBlock: number
  ): Promise<ChainDataCache> {
    const options = {
      fromBlock,
      toBlock,
    }

    return {
      mintingCancelledEvents:
        await this.tmewcVault.getOptimisticMintingCancelledEvents(options),
      mintingRequestedEvents:
        await this.tmewcVault.getOptimisticMintingRequestedEvents(options),
      mintingFinalizedEvents:
        await this.tmewcVault.getOptimisticMintingFinalizedEvents(options),
      minters: await this.tmewcVault.getMinters(),
      optimisticMintingDelay: await this.tmewcVault.optimisticMintingDelay(),
    }
  }

  private checkMintingCancels(cache: ChainDataCache) {
    return cache.mintingCancelledEvents.map(OptimisticMintingCancelled)
  }

  private async checkMintingRequestsValidity(cache: ChainDataCache) {
    const confirmations = await Promise.allSettled(
      cache.mintingRequestedEvents.map((ce) =>
        this.mewcClient.getTransactionConfirmations(ce.fundingTxHash)
      )
    )

    const systemEvents: SystemEvent[] = []

    cache.mintingRequestedEvents.forEach((ce, index) => {
      const confirmation = confirmations[index]

      switch (confirmation.status) {
        case "fulfilled": {
          const actualConfirmations = confirmation.value
          const requiredConfirmations = this.requiredConfirmations(
            ce.amount.div(satoshiMultiplier)
          )

          if (actualConfirmations < requiredConfirmations) {
            systemEvents.push(
              OptimisticMintingRequestedTooEarly(
                ce,
                actualConfirmations,
                requiredConfirmations
              )
            )
          }
          break
        }
        case "rejected": {
          systemEvents.push(
            OptimisticMintingRequestedForUndeterminedBtcTx(
              ce,
              `${confirmation.reason}`
            )
          )

          break
        }
      }
    })

    return systemEvents
  }

  private requiredConfirmations(amountSat: BigNumber): number {
    if (amountSat.lt(10000000)) {
      // 0.1 MEWC
      return 1
    }

    if (amountSat.lt(100000000)) {
      // 1 MEWC
      return 3
    }

    return 6
  }

  private async checkDesignatedMintersHealth(cache: ChainDataCache) {
    const systemEvents: SystemEvent[] = []

    systemEvents.push(...this.checkDesignatedMintersRequests(cache))
    systemEvents.push(
      ...(await this.checkDesignatedMintersFinalizations(cache))
    )

    return systemEvents
  }

  private checkDesignatedMintersRequests(cache: ChainDataCache): SystemEvent[] {
    return cache.mintingRequestedEvents
      .map((mre) => ({
        ...mre,
        designatedMinter: this.getDesignatedMinter(
          cache.minters,
          mre.depositor,
          mre.fundingTxHash
        ),
      }))
      .filter((mre) => !mre.minter.equals(mre.designatedMinter))
      .map((mre) =>
        OptimisticMintingNotRequestedByDesignatedMinter(
          mre,
          mre.designatedMinter
        )
      )
  }

  private async checkDesignatedMintersFinalizations(
    cache: ChainDataCache
  ): Promise<SystemEvent[]> {
    // Unlike OptimisticMintingRequested chain events, the OptimisticMintingFinalized
    // chain events don't contain the fundingTxHash needed to compute the
    // designated minter for the given minting finalization. We need to manually
    // enrich OptimisticMintingFinalized chain events with designated minter.
    // In order to do so, we first need to fetch the corresponding
    // OptimisticMintingRequested chain events and take the missing
    // fundingTxHash values from there.

    // Local helper type that represents an OptimisticMintingFinalized chain event
    // enriched with designated minter data.
    type EnrichedMintingFinalizedEvent =
      OptimisticMintingFinalizedChainEvent & {
        // Minter designated for finalization. In case the minter cannot be
        // determined for whatever reason, the value will be 'unknown'.
        designatedMinter: Identifier | "unknown"
        // If the designatedMinter is 'unknown', this field holds the cause
        // explaining why the minter could not be determined.
        designatedMinterUnknownCause: string
      }

    // Local function used to enrich an OptimisticMintingFinalized chain event
    // with designated minter data.
    const enrichMintingFinalizedEventFn = async (
      mintingFinalizedEvent: OptimisticMintingFinalizedChainEvent
    ): Promise<EnrichedMintingFinalizedEvent> => {
      let designatedMinter: Identifier | "unknown" = "unknown"
      let designatedMinterUnknownCause = ""

      try {
        // Look for corresponding OptimisticMintingRequested chain event with
        // same depositKey. The event filter arguments correspond to the
        // OptimisticMintingRequested chain events fields.
        const mintingRequestedEvents =
          await this.tmewcVault.getOptimisticMintingRequestedEvents(
            undefined, // options
            null, // minter filter arg
            mintingFinalizedEvent.depositKey.toPrefixedString(), // depositKey filter arg
            null, // depositor filter arg
            null, // amount filter arg
            null, // fundingTxHash filter arg
            null // fundingOutputIndex filter arg
          )

        // We expect exactly one request event matching the finalization event.
        // All other cases are abnormal.
        if (mintingRequestedEvents.length === 1) {
          const mintingRequestedEvent = mintingRequestedEvents[0]
          designatedMinter = this.getDesignatedMinter(
            cache.minters,
            mintingRequestedEvent.depositor,
            mintingRequestedEvent.fundingTxHash
          )
        } else {
          designatedMinterUnknownCause =
            "cannot determine a single minting request event; " +
            `fetched events are ${JSON.stringify(mintingRequestedEvents)}`
        }
      } catch (error) {
        designatedMinterUnknownCause = `cannot fetch minting request events: ${error}`
      }

      return {
        ...mintingFinalizedEvent,
        designatedMinter,
        designatedMinterUnknownCause,
      }
    }

    // Enhance the OptimisticMintingFinalized chain events with designated minters.
    // Promise.all should always resolve as enrichMintingFinalizedEventFn does not throw.
    const enrichedMintingFinalizedEvents = await Promise.all(
      cache.mintingFinalizedEvents.map(enrichMintingFinalizedEventFn)
    )

    // Produce a OptimisticMintingNotFinalizedByDesignatedMinter system event
    // for all OptimisticMintingFinalized chain events whose actual minter does
    // not match the designated one or whose designated minter is unknown.
    // Regarding the latter, it is better to produce a false-positive than
    // fail silently.
    return enrichedMintingFinalizedEvents
      .filter(
        (emfe) =>
          emfe.designatedMinter === "unknown" ||
          !emfe.minter.equals(emfe.designatedMinter)
      )
      .map((emfe) =>
        OptimisticMintingNotFinalizedByDesignatedMinter(
          emfe,
          emfe.designatedMinter,
          emfe.designatedMinterUnknownCause
        )
      )
  }

  private getDesignatedMinter(
    minters: Identifier[],
    depositor: Identifier,
    fundingTxHash: BitcoinTransactionHash
  ): Identifier {
    const d = depositor.identifierHex.slice(-1).charCodeAt(0)
    const f = fundingTxHash.toString().slice(-1).charCodeAt(0)

    // eslint-disable-next-line no-bitwise
    const index = (d ^ f) % minters.length

    return minters[index]
  }

  private async checkOrphanedMinting(
    cache: ChainDataCache,
    fromBlock: number,
    toBlock: number
  ): Promise<SystemEvent[]> {
    const systemEvents: SystemEvent[] = []

    systemEvents.push(
      ...(await this.checkMintingNotRequested(fromBlock, toBlock))
    )
    systemEvents.push(
      ...(await this.checkMintingNotFinalized(cache, fromBlock, toBlock))
    )

    return systemEvents
  }

  private async checkMintingNotRequested(
    fromBlock: number,
    toBlock: number
  ): Promise<SystemEvent[]> {
    const rewindBlock = (block: number, shift: number) =>
      block - shift > 0 ? block - shift : 0

    // We need to rewind the block window by the minting request timeout.
    // This way, we are looking for past deposits whose time for creating
    // the minting request was already elapsed.
    const chainEvents = await this.bridge.getDepositRevealedEvents({
      fromBlock: rewindBlock(fromBlock, mintingRequestTimeoutBlocks),
      toBlock: rewindBlock(toBlock, mintingRequestTimeoutBlocks),
    })

    const mintingRequests = await Promise.allSettled(
      chainEvents.map((ce) =>
        OptimisticMinting.getOptimisticMintingRequest(
          ce.fundingTxHash,
          ce.fundingOutputIndex,
          this.tmewcVault
        )
      )
    )

    return chainEvents
      .filter((ce, index) => {
        const request = mintingRequests[index]
        const requestExists =
          request.status === "fulfilled" && request.value.requestedAt !== 0
        return !requestExists
      })
      .map(OptimisticMintingNotRequestedByAnyMinter)
  }

  private async checkMintingNotFinalized(
    cache: ChainDataCache,
    fromBlock: number,
    toBlock: number
  ): Promise<SystemEvent[]> {
    const rewindBlock = (block: number, shift: number) =>
      block - shift > 0 ? block - shift : 0

    const finalizationTimeoutBlocks = mintingFinalizationTimeoutBlocks(
      cache.optimisticMintingDelay
    )

    // We need to rewind the block window by the minting finalization timeout.
    // This way, we are looking for past minting requests whose time for
    // finalization was already elapsed.
    const chainEvents =
      await this.tmewcVault.getOptimisticMintingRequestedEvents({
        fromBlock: rewindBlock(fromBlock, finalizationTimeoutBlocks),
        toBlock: rewindBlock(toBlock, finalizationTimeoutBlocks),
      })

    const mintingRequests = await Promise.allSettled(
      chainEvents.map((ce) =>
        OptimisticMinting.getOptimisticMintingRequest(
          ce.fundingTxHash,
          ce.fundingOutputIndex,
          this.tmewcVault
        )
      )
    )

    return chainEvents
      .filter((ce, index) => {
        const request = mintingRequests[index]
        const requestExists =
          request.status === "fulfilled" && request.value.finalizedAt !== 0
        return !requestExists
      })
      .map(OptimisticMintingNotFinalizedByAnyMinter)
  }
}
