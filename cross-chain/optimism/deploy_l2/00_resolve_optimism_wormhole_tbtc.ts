import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { helpers, deployments } = hre
  const { log } = deployments

  const OptimismWormholeTMEWC = await deployments.getOrNull(
    "OptimismWormholeTMEWC"
  )

  if (
    OptimismWormholeTMEWC &&
    helpers.address.isValid(OptimismWormholeTMEWC.address)
  ) {
    log(
      `using existing Optimism WormholeTMEWC at ${OptimismWormholeTMEWC.address}`
    )
  } else if (hre.network.name === "hardhat") {
    log("using fake Optimism WormholeTMEWC for hardhat network")
  } else {
    throw new Error("deployed Optimism WormholeTMEWC contract not found")
  }
}

export default func

func.tags = ["OptimismWormholeTMEWC"]
