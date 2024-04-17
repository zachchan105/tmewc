import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, helpers } = hre
  const { deployer, governance } = await getNamedAccounts()

  await helpers.ownable.transferOwnership("TMEWCVault", governance, deployer)
}

export default func

func.tags = ["TransferTMEWCVaultOwnership"]
func.dependencies = ["TMEWCVault"]
func.runAtTheEnd = true
