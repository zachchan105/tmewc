import { DepositsService } from "./deposits"
import { MaintenanceService } from "./maintenance"
import { RedemptionsService } from "./redemptions"
import {
  Chains,
  CrossChainContracts,
  CrossChainContractsLoader,
  L1CrossChainContracts,
  L2Chain,
  L2CrossChainContracts,
  TMEWCContracts,
} from "../lib/contracts"
import { BitcoinClient, BitcoinNetwork } from "../lib/meowcoin"
import {
  ethereumAddressFromSigner,
  EthereumSigner,
  ethereumCrossChainContractsLoader,
  loadEthereumCoreContracts,
} from "../lib/ethereum"
import { ElectrumClient } from "../lib/electrum"
import { loadBaseCrossChainContracts } from "../lib/base"

/**
 * Entrypoint component of the tMEWC SDK.
 */
export class TMEWC {
  /**
   * Service supporting the tMEWC deposit flow.
   */
  public readonly deposits: DepositsService
  /**
   * Service supporting authorized operations of tMEWC system maintainers
   * and operators.
   */
  public readonly maintenance: MaintenanceService
  /**
   * Service supporting the tMEWC redemption flow.
   */
  public readonly redemptions: RedemptionsService
  /**
   * Handle to tMEWC contracts for low-level access.
   */
  public readonly tmewcContracts: TMEWCContracts
  /**
   * Meowcoin client handle for low-level access.
   */
  public readonly bitcoinClient: BitcoinClient
  /**
   * Reference to the cross-chain contracts loader.
   */
  readonly #crossChainContractsLoader?: CrossChainContractsLoader
  /**
   * Mapping of cross-chain contracts for different supported L2 chains.
   * Each set of cross-chain contracts must be first initialized using
   * the `initializeCrossChain` method.
   */
  readonly #crossChainContracts: Map<L2Chain, CrossChainContracts>

  private constructor(
    tmewcContracts: TMEWCContracts,
    bitcoinClient: BitcoinClient,
    crossChainContractsLoader?: CrossChainContractsLoader
  ) {
    this.deposits = new DepositsService(
      tmewcContracts,
      bitcoinClient,
      (l2ChainName) => this.crossChainContracts(l2ChainName)
    )
    this.maintenance = new MaintenanceService(tmewcContracts, bitcoinClient)
    this.redemptions = new RedemptionsService(tmewcContracts, bitcoinClient)
    this.tmewcContracts = tmewcContracts
    this.bitcoinClient = bitcoinClient
    this.#crossChainContractsLoader = crossChainContractsLoader
    this.#crossChainContracts = new Map<L2Chain, CrossChainContracts>()
  }

  /**
   * Initializes the tMEWC SDK entrypoint for Ethereum and Meowcoin mainnets.
   * The initialized instance uses default Electrum servers to interact
   * with Meowcoin mainnet
   * @param signer Ethereum signer.
   * @returns Initialized tMEWC SDK entrypoint.
   * @throws Throws an error if the signer's Ethereum network is other than
   *         Ethereum mainnet.
   */
  static async initializeMainnet(signer: EthereumSigner): Promise<TMEWC> {
    return TMEWC.initializeEthereum(
      signer,
      Chains.Ethereum.Mainnet,
      BitcoinNetwork.Mainnet
    )
  }

  /**
   * Initializes the tMEWC SDK entrypoint for Ethereum Sepolia and Meowcoin testnet.
   * The initialized instance uses default Electrum servers to interact
   * with Meowcoin testnet
   * @param signer Ethereum signer.
   * @returns Initialized tMEWC SDK entrypoint.
   * @throws Throws an error if the signer's Ethereum network is other than
   *         Ethereum mainnet.
   */
  static async initializeSepolia(signer: EthereumSigner): Promise<TMEWC> {
    return TMEWC.initializeEthereum(
      signer,
      Chains.Ethereum.Sepolia,
      BitcoinNetwork.Testnet
    )
  }

  /**
   * Initializes the tMEWC SDK entrypoint for the given Ethereum network and Meowcoin network.
   * The initialized instance uses default Electrum servers to interact
   * with Meowcoin network.
   * @param signer Ethereum signer.
   * @param ethereumChainId Ethereum chain ID.
   * @param bitcoinNetwork Meowcoin network.
   * @param crossChainSupport Whether to enable cross-chain support. False by default.
   * @returns Initialized tMEWC SDK entrypoint.
   * @throws Throws an error if the underlying signer's Ethereum network is
   *         other than the given Ethereum network.
   */
  private static async initializeEthereum(
    signer: EthereumSigner,
    ethereumChainId: Chains.Ethereum,
    bitcoinNetwork: BitcoinNetwork,
    crossChainSupport = false
  ): Promise<TMEWC> {
    const signerAddress = await ethereumAddressFromSigner(signer)
    const tmewcContracts = await loadEthereumCoreContracts(
      signer,
      ethereumChainId
    )

    let crossChainContractsLoader: CrossChainContractsLoader | undefined =
      undefined
    if (crossChainSupport) {
      crossChainContractsLoader = await ethereumCrossChainContractsLoader(
        signer,
        ethereumChainId
      )
    }

    const bitcoinClient = ElectrumClient.fromDefaultConfig(bitcoinNetwork)

    const tmewc = new TMEWC(
      tmewcContracts,
      bitcoinClient,
      crossChainContractsLoader
    )

    // If signer address can be resolved, set it as default depositor.
    if (signerAddress !== undefined) {
      tmewc.deposits.setDefaultDepositor(signerAddress)
    }

    return tmewc
  }

  /**
   * Initializes the tMEWC SDK entrypoint with custom tMEWC contracts and
   * Meowcoin client.
   * @param tmewcContracts Custom tMEWC contracts handle.
   * @param bitcoinClient Custom Meowcoin client implementation.
   * @returns Initialized tMEWC SDK entrypoint.
   * @dev This function is especially useful for local development as it gives
   *      flexibility to combine different implementations of tMEWC contracts
   *      with different Meowcoin networks.
   */
  static async initializeCustom(
    tmewcContracts: TMEWCContracts,
    bitcoinClient: BitcoinClient
  ): Promise<TMEWC> {
    return new TMEWC(tmewcContracts, bitcoinClient)
  }

  /**
   * Initializes cross-chain contracts for the given L2 chain, using the
   * given signer. Updates the signer on subsequent calls.
   *
   * @experimental THIS IS EXPERIMENTAL CODE THAT CAN BE CHANGED OR REMOVED
   *               IN FUTURE RELEASES. IT SHOULD BE USED ONLY FOR INTERNAL
   *               PURPOSES AND EXTERNAL APPLICATIONS SHOULD NOT DEPEND ON IT.
   *               CROSS-CHAIN SUPPORT IS NOT FULLY OPERATIONAL YET.
   *
   * @param l2ChainName Name of the L2 chain for which to initialize
   *                    cross-chain contracts.
   * @param l2Signer Signer to use with the L2 chain contracts.
   * @returns Void promise.
   * @throws Throws an error if:
   *         - Cross-chain contracts loader is not available for this TMEWC SDK instance,
   *         - Chain mapping between the L1 and the given L2 chain is not defined.
   * @dev In case this function needs to support non-EVM L2 chains that can't
   *      use EthereumSigner as a signer type, the l2Signer parameter should
   *      probably be turned into a union of multiple supported types or
   *      generalized in some other way.
   */
  async initializeCrossChain(
    l2ChainName: L2Chain,
    l2Signer: EthereumSigner
  ): Promise<void> {
    if (!this.#crossChainContractsLoader) {
      throw new Error(
        "Cross-chain contracts loader not available for this instance"
      )
    }

    const chainMapping = this.#crossChainContractsLoader.loadChainMapping()
    if (!chainMapping) {
      throw new Error("Chain mapping between L1 and L2 chains not defined")
    }

    const l1CrossChainContracts: L1CrossChainContracts =
      await this.#crossChainContractsLoader.loadL1Contracts(l2ChainName)
    let l2CrossChainContracts: L2CrossChainContracts

    switch (l2ChainName) {
      case "Base":
        const baseChainId = chainMapping.base
        if (!baseChainId) {
          throw new Error("Base chain ID not available in chain mapping")
        }
        l2CrossChainContracts = await loadBaseCrossChainContracts(
          l2Signer,
          baseChainId
        )
        break
      default:
        throw new Error("Unsupported L2 chain")
    }

    this.#crossChainContracts.set(l2ChainName, {
      ...l1CrossChainContracts,
      ...l2CrossChainContracts,
    })
  }

  /**
   * Gets cross-chain contracts for the given supported L2 chain.
   * The given L2 chain contracts must be first initialized using the
   * `initializeCrossChain` method.
   *
   * @experimental THIS IS EXPERIMENTAL CODE THAT CAN BE CHANGED OR REMOVED
   *               IN FUTURE RELEASES. IT SHOULD BE USED ONLY FOR INTERNAL
   *               PURPOSES AND EXTERNAL APPLICATIONS SHOULD NOT DEPEND ON IT.
   *               CROSS-CHAIN SUPPORT IS NOT FULLY OPERATIONAL YET.
   *
   * @param l2ChainName Name of the L2 chain for which to get cross-chain contracts.
   * @returns Cross-chain contracts for the given L2 chain or
   *          undefined if not initialized.
   */
  crossChainContracts(l2ChainName: L2Chain): CrossChainContracts | undefined {
    return this.#crossChainContracts.get(l2ChainName)
  }
}
