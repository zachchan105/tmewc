import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, helpers } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCSaddleVault = await deployments.get("TMEWCSaddleVault")
  if (!helpers.address.isValid(TMEWCSaddleVault.address)) {
    throw new Error(
      `Invalid TMEWCSaddleVault address: ${TMEWCSaddleVault.address}`
    )
  }

  const TMEWCSaddlePoolSwap = await deployments.get("TMEWCSaddlePoolSwap")
  if (!helpers.address.isValid(TMEWCSaddlePoolSwap.address)) {
    throw new Error(
      `Invalid TMEWCSaddlePoolSwap address: ${TMEWCSaddlePoolSwap.address}`
    )
  }

  const TMEWCSaddleLPRewards = await deployments.get("TMEWCSaddleLPRewards")
  if (!helpers.address.isValid(TMEWCSaddleLPRewards.address)) {
    throw new Error(
      `Invalid TMEWCSaddleLPRewards address: ${TMEWCSaddleLPRewards.address}`
    )
  }

  log(`tmewcSaddleVault: ${TMEWCSaddleVault.address}`)
  log(`tmewcSaddlePoolSwap: ${TMEWCSaddlePoolSwap.address}`)
  log(`tmewcSaddleLPRewards: ${TMEWCSaddleLPRewards.address}`)

  await deploy("SaddleStrategy", {
    from: deployer,
    args: [
      TMEWCSaddleVault.address,
      TMEWCSaddlePoolSwap.address,
      TMEWCSaddleLPRewards.address,
    ],
    log: true,
    gasLimit: parseInt(process.env.GAS_LIMIT) || undefined,
  })
}

export default func

func.tags = ["SaddleStrategy"]
