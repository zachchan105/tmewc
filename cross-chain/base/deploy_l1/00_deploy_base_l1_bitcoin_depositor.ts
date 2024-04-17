import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"
import { getWormholeChains } from "../deploy_helpers/wormhole_chains"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, helpers, deployments } = hre
  const { deployer } = await getNamedAccounts()
  const l2Deployments = hre.companionNetworks.l2.deployments

  const wormholeChains = getWormholeChains(hre.network.name)

  const tmewcBridge = await deployments.get("Bridge")
  const tmewcVault = await deployments.get("TMEWCVault")
  const wormhole = await deployments.get("Wormhole")
  const wormholeRelayer = await deployments.get("WormholeRelayer")
  const wormholeTokenBridge = await deployments.get("TokenBridge")
  const baseWormholeGateway = await l2Deployments.get("BaseWormholeGateway")

  const [, proxyDeployment] = await helpers.upgrades.deployProxy(
    "BaseL1BitcoinDepositor",
    {
      contractName:
        "@keep-network/tmewc/contracts/l2/L1BitcoinDepositor.sol:L1BitcoinDepositor",
      initializerArgs: [
        tmewcBridge.address,
        tmewcVault.address,
        wormhole.address,
        wormholeRelayer.address,
        wormholeTokenBridge.address,
        baseWormholeGateway.address,
        wormholeChains.l2ChainId,
      ],
      factoryOpts: { signer: await ethers.getSigner(deployer) },
      proxyOpts: {
        kind: "transparent",
      },
    }
  )

  if (hre.network.tags.etherscan) {
    // We use `verify` instead of `verify:verify` as the `verify` task is defined
    // in "@openzeppelin/hardhat-upgrades" to perform Etherscan verification
    // of Proxy and Implementation contracts.
    await hre.run("verify", {
      address: proxyDeployment.address,
      constructorArgsParams: proxyDeployment.args,
    })
  }
}

export default func

func.tags = ["BaseL1BitcoinDepositor"]
