import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, helpers } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const tmewc = await deploy("TMEWC", {
    from: deployer,
    log: true,
  })

  if (hre.network.tags.etherscan) {
    await helpers.etherscan.verify(tmewc)
  }

  if (hre.network.tags.tenderly) {
    await hre.tenderly.verify({
      name: "TMEWC",
      address: tmewc.address,
    })
  }
}

export default func

func.tags = ["TMEWC"]
