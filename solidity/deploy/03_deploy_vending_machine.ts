import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, helpers, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCToken = await deployments.get("TMEWCToken")
  const TMEWC = await deployments.get("TMEWC") // tMEWC

  const unmintFee = 0

  const vendingMachine = await deploy("VendingMachine", {
    from: deployer,
    args: [TMEWCToken.address, TMEWC.address, unmintFee],
    log: true,
    waitConfirmations: 1,
  })

  if (hre.network.tags.etherscan) {
    await helpers.etherscan.verify(vendingMachine)
  }

  if (hre.network.tags.tenderly) {
    await hre.tenderly.verify({
      name: "VendingMachine",
      address: vendingMachine.address,
    })
  }
}

export default func

func.tags = ["VendingMachine"]
func.dependencies = ["TMEWCToken", "TMEWC"]
