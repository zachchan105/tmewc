import fs from "fs"

import { helpers, network } from "hardhat"
import {
  EthereumBridge,
  EthereumTMEWCToken,
  EthereumTMEWCVault,
} from "@zachchan105/tmewc.ts"

import { keyPairFromWif } from "./meowcoin"

import type { ContractExport, Export } from "hardhat-deploy/dist/types"
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import type { KeyPair as BitcoinKeyPair } from "./meowcoin"
import type { TMEWCContracts } from "@zachchan105/tmewc.ts"

// TODO: For now, the context and its setup is global and identical for each
//       scenario. Once more scenarios is added, this should be probably
//       split into the global common context and specialized per-scenario addons.

/**
 * Represents a context of the given system tests scenario.
 */
export interface SystemTestsContext {
  /**
   * Electrum instance connection URL.
   */
  electrumUrl: string
  /**
   * Handle to the deployed contracts info.
   */
  deployedContracts: DeployedContracts
  /**
   * Ethereum signer representing the contract governance.
   */
  governance: SignerWithAddress
  /**
   * Ethereum signer representing the system maintainer.
   */
  maintainer: SignerWithAddress
  /**
   * Ethereum signer representing the depositor.
   */
  depositor: SignerWithAddress
  /**
   * Meowcoin key pair of the depositor.
   */
  depositorBitcoinKeyPair: BitcoinKeyPair
  /**
   * Meowcoin key pair of the wallet.
   */
  walletBitcoinKeyPair: BitcoinKeyPair
}

/**
 * Deployed contracts info containing contracts' addresses and ABIs.
 */
interface DeployedContracts {
  [name: string]: ContractExport
}

/**
 * Sets up the system tests context.
 * @returns System tests context.
 */
export async function setupSystemTestsContext(): Promise<SystemTestsContext> {
  const electrumUrl = process.env.ELECTRUM_URL
  if (!electrumUrl) {
    throw new Error("ELECTRUM_URL is not set")
  }

  if (network.name === "hardhat") {
    throw new Error("Built-in Hardhat network is not supported")
  }

  const { contracts: deployedContracts, name } =
    readContractsDeploymentExportFile()
  if (network.name !== name) {
    throw new Error("Deployment export file refers to another network")
  }

  const { governance, maintainer, depositor } =
    await helpers.signers.getNamedSigners()

  let depositorBitcoinKeyPair
  try {
    depositorBitcoinKeyPair = readBitcoinWif("DEPOSITOR_BITCOIN_WIF")
  } catch (e) {
    throw new Error(`Invalid DEPOSITOR_BITCOIN_WIF: ${e}`)
  }

  let walletBitcoinKeyPair
  try {
    walletBitcoinKeyPair = readBitcoinWif("WALLET_BITCOIN_WIF")
  } catch (e) {
    throw new Error(`Invalid WALLET_BITCOIN_WIF: ${e}`)
  }

  console.log(`
    System tests context:
    - Electrum URL: ${electrumUrl}
    - Ethereum network: ${network.name}
    - Bridge address ${deployedContracts.Bridge.address}
    - TMEWCVault address ${deployedContracts.TMEWCVault.address}
    - TMEWC token address ${deployedContracts.TMEWC.address}
    - Governance Ethereum address ${governance.address}
    - Maintainer Ethereum address ${maintainer.address}
    - Depositor Ethereum address ${depositor.address}
    - Depositor Meowcoin public key ${depositorBitcoinKeyPair.publicKey.compressed}
    - Wallet Meowcoin public key ${walletBitcoinKeyPair.publicKey.compressed}
  `)

  return {
    electrumUrl,
    deployedContracts,
    governance,
    maintainer,
    depositor,
    depositorBitcoinKeyPair,
    walletBitcoinKeyPair,
  }
}

/**
 * Reads the contract deployment export file. The file path is supposed to be
 * passed as CONTRACTS_DEPLOYMENT_EXPORT_FILE_PATH env variable. The file should
 * contain a JSON representing the deployment info.
 * @returns Deployment export file.
 */
function readContractsDeploymentExportFile(): Export {
  const contractsDeploymentExportFilePath =
    process.env.CONTRACTS_DEPLOYMENT_EXPORT_FILE_PATH
  if (contractsDeploymentExportFilePath) {
    const contractsDeploymentExportFile = fs.readFileSync(
      contractsDeploymentExportFilePath
    )
    return JSON.parse(contractsDeploymentExportFile)
  }

  throw new Error("CONTRACTS_DEPLOYMENT_EXPORT_FILE_PATH is not set")
}

/**
 * Reads a Meowcoin WIF from an environment variable and creates a key pair
 * based on it. Throws if the environment variable is not set.
 * @param wifEnvName Name of the environment variable that contains the WIF.
 * @returns Meowcoin key pair corresponding to the WIF.
 */
function readBitcoinWif(wifEnvName: string): BitcoinKeyPair {
  const wif = process.env[wifEnvName] as string

  if (!wif) {
    throw new Error(`${wifEnvName} is not set`)
  }

  return keyPairFromWif(wif)
}

/**
 * Creates TMEWC contract handles for the given signer.
 * @param deployedContracts Deployed contracts info.
 * @param signer Signer used when communicating with the contracts.
 * @returns TMEWC contract handles.
 */
export async function createTmewcContractsHandle(
  deployedContracts: DeployedContracts,
  signer: SignerWithAddress
): Promise<TMEWCContracts> {
  const bridge = new EthereumBridge({
    address: deployedContracts.Bridge.address,
    signerOrProvider: signer,
  })

  const tmewcToken = new EthereumTMEWCToken({
    address: deployedContracts.TMEWC.address,
    signerOrProvider: signer,
  })

  const tmewcVault = new EthereumTMEWCVault({
    address: deployedContracts.TMEWCVault.address,
    signerOrProvider: signer,
  })

  const walletRegistry = await bridge.walletRegistry()

  return {
    bridge,
    tmewcToken,
    tmewcVault,
    walletRegistry,
  }
}
