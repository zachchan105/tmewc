import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, helpers } = hre
  const { deployer } = await getNamedAccounts()

  await helpers.upgrades.deployProxy("PolygonTMEWC", {
    contractName: "@keep-network/tmewc/contracts/l2/L2TMEWC.sol:L2TMEWC",
    initializerArgs: ["Polygon tMEWC", "tMEWC"],
    factoryOpts: { signer: await ethers.getSigner(deployer) },
    proxyOpts: {
      kind: "transparent",
    },
  })
}

export default func

func.tags = ["PolygonTMEWC"]
