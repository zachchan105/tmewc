import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { helpers, deployments } = hre
  const { log } = deployments

  const PolygonWormholeTMEWC = await deployments.getOrNull("PolygonWormholeTMEWC")

  if (
    PolygonWormholeTMEWC &&
    helpers.address.isValid(PolygonWormholeTMEWC.address)
  ) {
    log(`using existing Polygon WormholeTMEWC at ${PolygonWormholeTMEWC.address}`)
  } else if (hre.network.name === "hardhat") {
    log("using fake Polygon WormholeTMEWC for hardhat network")
  } else {
    throw new Error("deployed Polygon WormholeTMEWC contract not found")
  }
}

export default func

func.tags = ["PolygonWormholeTMEWC"]
