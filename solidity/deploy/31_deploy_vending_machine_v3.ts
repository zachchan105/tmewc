import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, helpers, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCToken = await deployments.get("TMEWCToken")
  const TMEWC = await deployments.get("TMEWC") // tMEWC

  const vendingMachineV3 = await deploy("VendingMachineV3", {
    from: deployer,
    args: [TMEWCToken.address, TMEWC.address],
    log: true,
    waitConfirmations: 1,
  })

  if (hre.network.tags.etherscan) {
    await helpers.etherscan.verify(vendingMachineV3)
  }

  if (hre.network.tags.tenderly) {
    await hre.tenderly.verify({
      name: "VendingMachineV",
      address: vendingMachineV3.address,
    })
  }
}

export default func

func.tags = ["VendingMachineV3"]
func.dependencies = ["TMEWCToken", "TMEWC"]
