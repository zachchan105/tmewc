import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, helpers } = hre
  const { deployer, governance } = await getNamedAccounts()

  await helpers.ownable.transferOwnership("BaseTMEWC", governance, deployer)
}

export default func

func.tags = ["TransferBaseTMEWCOwnership"]
func.dependencies = ["BaseTMEWC", "AuthorizeWormholeGateway"]
func.runAtTheEnd = true
