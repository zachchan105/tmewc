import {
  chainIdFromSigner,
  ethereumAddressFromSigner,
  EthereumSigner,
} from "../ethereum"
import { BaseL2BitcoinDepositor } from "./l2-meowcoin-depositor"
import { BaseL2TMEWCToken } from "./l2-tmewc-token"
import { Chains, L2CrossChainContracts } from "../contracts"

export * from "./l2-meowcoin-depositor"
export * from "./l2-tmewc-token"

/**
 * Loads Base implementation of tMEWC cross-chain contracts for the given Base
 * chain ID and attaches the given signer there.
 * @param signer Signer that should be attached to the contracts.
 * @param chainId Base chain ID.
 * @returns Handle to the contracts.
 * @throws Throws an error if the signer's Base chain ID is other than
 *         the one used to load contracts.
 */
export async function loadBaseCrossChainContracts(
  signer: EthereumSigner,
  chainId: Chains.Base
): Promise<L2CrossChainContracts> {
  const signerChainId = await chainIdFromSigner(signer)
  if (signerChainId !== chainId) {
    throw new Error(
      "Signer uses different chain than Base cross-chain contracts"
    )
  }

  const l2BitcoinDepositor = new BaseL2BitcoinDepositor(
    { signerOrProvider: signer },
    chainId
  )
  l2BitcoinDepositor.setDepositOwner(await ethereumAddressFromSigner(signer))

  const l2TmewcToken = new BaseL2TMEWCToken({ signerOrProvider: signer }, chainId)

  return {
    l2BitcoinDepositor,
    l2TmewcToken,
  }
}
