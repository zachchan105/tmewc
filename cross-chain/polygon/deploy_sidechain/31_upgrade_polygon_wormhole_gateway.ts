import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, helpers, deployments } = hre
  const { deployer } = await getNamedAccounts()

  const PolygonTokenBridge = await deployments.get("PolygonTokenBridge")
  const PolygonWormholeTMEWC = await deployments.get("PolygonWormholeTMEWC")
  const PolygonTMEWC = await deployments.get("PolygonTMEWC")

  await helpers.upgrades.upgradeProxy(
    "PolygonWormholeGateway",
    "PolygonWormholeGateway",
    {
      contractName:
        "@zachchan105/tmewc/contracts/l2/L2WormholeGateway.sol:L2WormholeGateway",
      initializerArgs: [
        PolygonTokenBridge.address,
        PolygonWormholeTMEWC.address,
        PolygonTMEWC.address,
      ],
      factoryOpts: { signer: await ethers.getSigner(deployer) },
      proxyOpts: {
        kind: "transparent",
      },
    }
  )
}

export default func

func.tags = ["UpgradePolygonWormholeGateway"]

// Comment this line when running an upgrade.
// yarn deploy --tags UpgradePolygonWormholeGateway --network <network>
func.skip = async () => true
