import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { helpers, deployments } = hre
  const { log } = deployments

  const BaseWormholeTMEWC = await deployments.getOrNull("BaseWormholeTMEWC")

  if (BaseWormholeTMEWC && helpers.address.isValid(BaseWormholeTMEWC.address)) {
    log(`using existing Base WormholeTMEWC at ${BaseWormholeTMEWC.address}`)
  } else if (hre.network.name === "hardhat") {
    log("using fake Base WormholeTMEWC for hardhat network")
  } else {
    throw new Error("deployed Base WormholeTMEWC contract not found")
  }
}

export default func

func.tags = ["BaseWormholeTMEWC"]
