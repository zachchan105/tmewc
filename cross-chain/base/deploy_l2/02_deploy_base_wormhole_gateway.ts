import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, helpers, deployments } = hre
  const { log } = deployments
  const { deployer } = await getNamedAccounts()

  // These are the fake random addresses for local development purposes only.
  const fakeTokenBridge = "0x0af5DC16568EFF2d480a43A77E6C409e497FcFb9"
  const fakeWormholeTMEWC = "0xe1F0b28a3518cCeC430d0d86Ea1725e6256b0296"

  const baseTokenBridge = await deployments.getOrNull("BaseTokenBridge")
  const baseWormholeTMEWC = await deployments.getOrNull("BaseWormholeTMEWC")

  const baseTMEWC = await deployments.get("BaseTMEWC")

  let baseTokenBridgeAddress = baseTokenBridge?.address
  if (!baseTokenBridgeAddress && hre.network.name === "hardhat") {
    baseTokenBridgeAddress = fakeTokenBridge
    log(`fake Base TokenBridge address ${baseTokenBridgeAddress}`)
  }

  let baseWormholeTMEWCAddress = baseWormholeTMEWC?.address
  if (!baseWormholeTMEWCAddress && hre.network.name === "hardhat") {
    baseWormholeTMEWCAddress = fakeWormholeTMEWC
    log(`fake Base WormholeTMEWC address ${baseWormholeTMEWCAddress}`)
  }

  const [, proxyDeployment] = await helpers.upgrades.deployProxy(
    "BaseWormholeGateway",
    {
      contractName:
        "@zachchan105/tmewc/contracts/l2/L2WormholeGateway.sol:L2WormholeGateway",
      initializerArgs: [
        baseTokenBridgeAddress,
        baseWormholeTMEWCAddress,
        baseTMEWC.address,
      ],
      factoryOpts: { signer: await ethers.getSigner(deployer) },
      proxyOpts: {
        kind: "transparent",
      },
    }
  )

  // TODO: Investigate the possibility of adding Tenderly verification for
  // L2 and upgradable proxy.

  // Contracts can be verified on L2 Base Etherscan in a similar way as we
  // do it on L1 Etherscan
  if (hre.network.tags.basescan) {
    // We use `verify` instead of `verify:verify` as the `verify` task is defined
    // in "@openzeppelin/hardhat-upgrades" to verify the proxy’s implementation
    // contract, the proxy itself and any proxy-related contracts, as well as
    // link the proxy to the implementation contract’s ABI on (Ether)scan.
    await hre.run("verify", {
      address: proxyDeployment.address,
      constructorArgsParams: [],
    })
  }
}

export default func

func.tags = ["BaseWormholeGateway"]
func.dependencies = ["BaseTokenBridge", "BaseWormholeTMEWC"]
