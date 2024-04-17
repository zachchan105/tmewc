import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, helpers } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCCurveVault = await deployments.get("TMEWCCurveVault")
  if (!helpers.address.isValid(TMEWCCurveVault.address)) {
    throw new Error(`Invalid TMEWCCurveVault address: ${TMEWCCurveVault.address}`)
  }

  const TMEWCCurvePoolDepositor = await deployments.get("TMEWCCurvePoolDepositor")
  if (!helpers.address.isValid(TMEWCCurvePoolDepositor.address)) {
    throw new Error(
      `Invalid TMEWCCurvePoolDepositor address: ${TMEWCCurvePoolDepositor.address}`
    )
  }

  const TMEWCConvexRewardPool = await deployments.get("TMEWCConvexRewardPool")
  if (!TMEWCConvexRewardPool.linkedData.id) {
    throw new Error("ID of TMEWCConvexRewardPool must be set")
  }

  log(`tmewcCurveVault: ${TMEWCCurveVault.address}`)
  log(`tmewcCurvePoolDepositor: ${TMEWCCurvePoolDepositor.address}`)
  log(`tmewcConvexRewardPoolId: ${TMEWCConvexRewardPool.linkedData.id}`)

  await deploy("ConvexStrategy", {
    from: deployer,
    args: [
      TMEWCCurveVault.address,
      TMEWCCurvePoolDepositor.address,
      TMEWCConvexRewardPool.linkedData.id,
    ],
    log: true,
    gasLimit: parseInt(process.env.GAS_LIMIT) || undefined,
  })
}

export default func

func.tags = ["ConvexStrategy"]
