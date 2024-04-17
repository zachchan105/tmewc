import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { execute } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCVault = await deployments.get("TMEWCVault")

  await execute(
    "Bridge",
    { from: deployer, log: true, waitConfirmations: 1 },
    "setVaultStatus",
    TMEWCVault.address,
    true
  )
}

export default func

func.tags = ["AuthorizeTMEWCVault"]
func.dependencies = ["Bridge", "TMEWCVault"]
