import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, helpers } = hre
  const { deployer, governance } = await getNamedAccounts()

  await helpers.ownable.transferOwnership("PolygonTMEWC", governance, deployer)
}

export default func

func.tags = ["TransferPolygonTMEWCOwnership"]
func.dependencies = ["PolygonTMEWC", "AuthorizeWormholeGateway"]
func.runAtTheEnd = true
