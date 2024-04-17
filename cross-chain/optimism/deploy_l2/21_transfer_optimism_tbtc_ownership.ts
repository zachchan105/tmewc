import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, helpers } = hre
  const { deployer, governance } = await getNamedAccounts()

  await helpers.ownable.transferOwnership("OptimismTMEWC", governance, deployer)
}

export default func

func.tags = ["TransferOptimismTMEWCOwnership"]
func.dependencies = ["OptimismTMEWC", "AuthorizeWormholeGateway"]
func.runAtTheEnd = true
