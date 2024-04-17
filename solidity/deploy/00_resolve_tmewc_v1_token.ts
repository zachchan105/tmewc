import { HardhatRuntimeEnvironment, HardhatNetworkConfig } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, helpers } = hre
  const { log } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCToken = await deployments.getOrNull("TMEWCToken")

  if (TMEWCToken && helpers.address.isValid(TMEWCToken.address)) {
    log(`using external TMEWCToken at ${TMEWCToken.address}`)
  } else if (
    !hre.network.tags.allowStubs ||
    (hre.network.config as HardhatNetworkConfig)?.forking?.enabled
  ) {
    throw new Error("deployed TMEWCToken contract not found")
  } else {
    log("deploying TMEWCToken stub")

    await deployments.deploy("TMEWCToken", {
      contract: "TestERC20",
      from: deployer,
      log: true,
    })
  }
}

export default func

func.tags = ["TMEWCToken"]
