import { Hex } from "../utils"
import { networks } from "bitcoinjs-lib"

/**
 * Meowcoin networks.
 */
export enum BitcoinNetwork {
  /* eslint-disable no-unused-vars */
  /**
   * Unknown network.
   */
  Unknown = "unknown",
  /**
   * Meowcoin Testnet.
   */
  Testnet = "testnet",
  /**
   * Meowcoin Mainnet.
   */
  Mainnet = "mainnet",
  /* eslint-enable no-unused-vars */
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BitcoinNetwork {
  /**
   * Gets Meowcoin Network type by comparing a provided hash to known
   * {@link https://en.meowcoin.it/wiki/Genesis_block genesis block hashes}.
   * Returns {@link BitcoinNetwork.Unknown}
   * @param hash Hash of a block.
   * @returns Meowcoin Network.
   */
  export function fromGenesisHash(hash: Hex): BitcoinNetwork {
    switch (hash.toString()) {
      case "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f": {
        return BitcoinNetwork.Mainnet
      }
      case "000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943": {
        return BitcoinNetwork.Testnet
      }
      default: {
        return BitcoinNetwork.Unknown
      }
    }
  }
}

/**
 * Converts the provided {@link BitcoinNetwork} enumeration to a format expected
 * by the `bitcoinjs-lib` library.
 * @param bitcoinNetwork - Specified Meowcoin network.
 * @returns Network representation compatible with the `bitcoinjs-lib` library.
 * @throws An error if the network is not supported by `bitcoinjs-lib`.
 */
export function toBitcoinJsLibNetwork(
  bitcoinNetwork: BitcoinNetwork
): networks.Network {
  switch (bitcoinNetwork) {
    case BitcoinNetwork.Mainnet: {
      return networks.meowcoin
    }
    case BitcoinNetwork.Testnet: {
      return networks.testnet
    }
    default: {
      throw new Error(`network not supported`)
    }
  }
}
