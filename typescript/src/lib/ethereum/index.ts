import {
  ChainMappings,
  Chains,
  CrossChainContractsLoader,
  L2Chain,
  TMEWCContracts,
} from "../contracts"
import { providers, Signer } from "ethers"
import { EthereumBridge } from "./bridge"
import { EthereumWalletRegistry } from "./wallet-registry"
import { EthereumTMEWCToken } from "./tmewc-token"
import { EthereumTMEWCVault } from "./tmewc-vault"
import { EthereumAddress } from "./address"
import { EthereumL1BitcoinDepositor } from "./l1-meowcoin-depositor"

export * from "./address"
export * from "./bridge"
export * from "./depositor-proxy"
export * from "./l1-meowcoin-depositor"
export * from "./tmewc-token"
export * from "./tmewc-vault"
export * from "./wallet-registry"

// The `adapter` module should not be re-exported directly as it
// contains low-level contract integration code. Re-export only components
// that are relevant for `lib/ethereum` clients.
export { EthersContractConfig as EthereumContractConfig } from "./adapter"

/**
 * Represents an Ethereum signer. This type is a wrapper for Ethers-specific
 * types and can be either a Signer that can make write transactions
 * or a Provider that works only in the read-only mode.
 */
export type EthereumSigner = Signer | providers.Provider

/**
 * Resolves the chain ID from the given signer.
 * @param signer The signer whose chain ID should be resolved.
 * @returns Chain ID as a string.
 */
export async function chainIdFromSigner(
  signer: EthereumSigner
): Promise<string> {
  let chainId: number
  if (Signer.isSigner(signer)) {
    chainId = await signer.getChainId()
  } else {
    const network = await signer.getNetwork()
    chainId = network.chainId
  }

  return chainId.toString()
}

/**
 * Resolves the Ethereum address tied to the given signer. The address
 * cannot be resolved for signers that works in the read-only mode
 * @param signer The signer whose address should be resolved.
 * @returns Ethereum address or undefined for read-only signers.
 * @throws Throws an error if the address of the signer is not a proper
 *         Ethereum address.
 */
export async function ethereumAddressFromSigner(
  signer: EthereumSigner
): Promise<EthereumAddress | undefined> {
  if (Signer.isSigner(signer)) {
    return EthereumAddress.from(await signer.getAddress())
  } else {
    return undefined
  }
}

/**
 * Loads Ethereum implementation of tMEWC core contracts for the given Ethereum
 * chain ID and attaches the given signer there.
 * @param signer Signer that should be attached to tMEWC contracts.
 * @param chainId Ethereum chain ID.
 * @returns Handle to tMEWC core contracts.
 * @throws Throws an error if the signer's Ethereum chain ID is other than
 *         the one used to load tMEWC contracts.
 */
export async function loadEthereumCoreContracts(
  signer: EthereumSigner,
  chainId: Chains.Ethereum
): Promise<TMEWCContracts> {
  const signerChainId = await chainIdFromSigner(signer)
  if (signerChainId !== chainId) {
    throw new Error("Signer uses different chain than Ethereum core contracts")
  }

  const bridge = new EthereumBridge({ signerOrProvider: signer }, chainId)
  const tmewcToken = new EthereumTMEWCToken({ signerOrProvider: signer }, chainId)
  const tmewcVault = new EthereumTMEWCVault({ signerOrProvider: signer }, chainId)
  const walletRegistry = new EthereumWalletRegistry(
    { signerOrProvider: signer },
    chainId
  )

  return {
    bridge,
    tmewcToken,
    tmewcVault,
    walletRegistry,
  }
}

/**
 * Creates the Ethereum implementation of tMEWC cross-chain contracts loader.
 * The provided signer is attached to loaded L1 contracts. The given
 * Ethereum chain ID is used to load the L1 contracts and resolve the chain
 * mapping that provides corresponding L2 chains IDs.
 * @param signer Ethereum L1 signer.
 * @param chainId Ethereum L1 chain ID.
 * @returns Loader for tMEWC cross-chain contracts.
 * @throws Throws an error if the signer's Ethereum chain ID is other than
 *         the one used to construct the loader.
 */
export async function ethereumCrossChainContractsLoader(
  signer: EthereumSigner,
  chainId: Chains.Ethereum
): Promise<CrossChainContractsLoader> {
  const signerChainId = await chainIdFromSigner(signer)
  if (signerChainId !== chainId) {
    throw new Error(
      "Signer uses different chain than Ethereum cross-chain contracts"
    )
  }

  const loadChainMapping = () =>
    ChainMappings.find((ecm) => ecm.ethereum === chainId)

  const loadL1Contracts = async (l2ChainName: L2Chain) => ({
    l1BitcoinDepositor: new EthereumL1BitcoinDepositor(
      { signerOrProvider: signer },
      chainId,
      l2ChainName
    ),
  })

  return {
    loadChainMapping,
    loadL1Contracts,
  }
}
