import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, helpers, deployments } = hre
  const { log } = deployments
  const { deployer } = await getNamedAccounts()

  // These are the fake random addresses for local development purposes only.
  const fakeTokenBridge = "0x0af5DC16568EFF2d480a43A77E6C409e497FcFb9"
  const fakeWormholeTMEWC = "0xe1F0b28a3518cCeC430d0d86Ea1725e6256b0296"

  const polygonTokenBridge = await deployments.getOrNull("PolygonTokenBridge")
  const polygonWormholeTMEWC = await deployments.getOrNull("PolygonWormholeTMEWC")

  const polygonTMEWC = await deployments.get("PolygonTMEWC")

  let polygonTokenBridgeAddress = polygonTokenBridge?.address
  if (!polygonTokenBridgeAddress && hre.network.name === "hardhat") {
    polygonTokenBridgeAddress = fakeTokenBridge
    log(`fake Polygon TokenBridge address ${polygonTokenBridgeAddress}`)
  }

  let polygonWormholeTMEWCAddress = polygonWormholeTMEWC?.address
  if (!polygonWormholeTMEWCAddress && hre.network.name === "hardhat") {
    polygonWormholeTMEWCAddress = fakeWormholeTMEWC
    log(`fake Polygon WormholeTMEWC address ${polygonWormholeTMEWCAddress}`)
  }

  await helpers.upgrades.deployProxy("PolygonWormholeGateway", {
    contractName:
      "@zachchan105/tmewc/contracts/l2/L2WormholeGateway.sol:L2WormholeGateway",
    initializerArgs: [
      polygonTokenBridgeAddress,
      polygonWormholeTMEWCAddress,
      polygonTMEWC.address,
    ],
    factoryOpts: { signer: await ethers.getSigner(deployer) },
    proxyOpts: {
      kind: "transparent",
    },
  })
}

export default func

func.tags = ["PolygonWormholeGateway"]
func.dependencies = ["PolygonTokenBridge", "PolygonWormholeTMEWC"]
