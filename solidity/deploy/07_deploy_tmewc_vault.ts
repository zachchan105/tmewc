import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, helpers } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const Bank = await deployments.get("Bank")
  const TMEWC = await deployments.get("TMEWC")
  const Bridge = await deployments.get("Bridge")

  const tmewcVault = await deploy("TMEWCVault", {
    contract: "TMEWCVault",
    from: deployer,
    args: [Bank.address, TMEWC.address, Bridge.address],
    log: true,
    waitConfirmations: 1,
  })

  if (hre.network.tags.etherscan) {
    await helpers.etherscan.verify(tmewcVault)
  }

  if (hre.network.tags.tenderly) {
    await hre.tenderly.verify({
      name: "TMEWCVault",
      address: tmewcVault.address,
    })
  }
}

export default func

func.tags = ["TMEWCVault"]
func.dependencies = ["Bank", "TMEWC"]
