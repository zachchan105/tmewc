import {
  EthersContractConfig,
  EthersContractDeployment,
  EthersContractHandle,
} from "../ethereum/adapter"
import { L2TMEWC as L2TMEWCTypechain } from "../../../typechain/L2TMEWC"
import { ChainIdentifier, Chains, L2TMEWCToken } from "../contracts"
import { BigNumber } from "ethers"
import { EthereumAddress } from "../ethereum"

// TODO: Uncomment once Base native minting is available on Base mainnet.
// import BaseL2TMEWCTokenDeployment from "./artifacts/base/BaseTMEWC.json"
import BaseSepoliaL2TMEWCTokenDeployment from "./artifacts/baseSepolia/BaseTMEWC.json"

/**
 * Implementation of the Base L2TMEWCToken handle.
 * @see {L2TMEWCToken} for reference.
 */
export class BaseL2TMEWCToken
  extends EthersContractHandle<L2TMEWCTypechain>
  implements L2TMEWCToken
{
  constructor(config: EthersContractConfig, chainId: Chains.Base) {
    let deployment: EthersContractDeployment

    switch (chainId) {
      case Chains.Base.BaseSepolia:
        deployment = BaseSepoliaL2TMEWCTokenDeployment
        break
      // TODO: Uncomment once Base native minting is available on Base mainnet.
      // case Chains.Base.Base:
      //   deployment = BaseL2TMEWCTokenDeployment
      //   break
      default:
        throw new Error("Unsupported deployment type")
    }

    super(config, deployment)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {L2TMEWCToken#getChainIdentifier}
   */
  getChainIdentifier(): ChainIdentifier {
    return EthereumAddress.from(this._instance.address)
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * @see {L2TMEWCToken#balanceOf}
   */
  balanceOf(identifier: ChainIdentifier): Promise<BigNumber> {
    return this._instance.balanceOf(`0x${identifier.identifierHex}`)
  }
}
