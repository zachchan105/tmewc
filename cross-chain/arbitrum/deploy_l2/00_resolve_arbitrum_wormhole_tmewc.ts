import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { helpers, deployments } = hre
  const { log } = deployments

  const ArbitrumWormholeTMEWC = await deployments.getOrNull(
    "ArbitrumWormholeTMEWC"
  )

  if (
    ArbitrumWormholeTMEWC &&
    helpers.address.isValid(ArbitrumWormholeTMEWC.address)
  ) {
    log(
      `using existing Arbitrum WormholeTMEWC at ${ArbitrumWormholeTMEWC.address}`
    )
  } else if (hre.network.name === "hardhat") {
    log("using fake Arbitrum WormholeTMEWC for hardhat network")
  } else {
    throw new Error("deployed Arbitrum WormholeTMEWC contract not found")
  }
}

export default func

func.tags = ["ArbitrumWormholeTMEWC"]
