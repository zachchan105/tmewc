import type { HardhatRuntimeEnvironment } from "hardhat/types"
import type { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts, helpers } = hre
  const { deployer } = await getNamedAccounts()

  const [, proxyDeployment] = await helpers.upgrades.deployProxy("BaseTMEWC", {
    contractName: "@zachchan105/tmewc/contracts/l2/L2TMEWC.sol:L2TMEWC",
    initializerArgs: ["Base tMEWC", "tMEWC"],
    factoryOpts: { signer: await ethers.getSigner(deployer) },
    proxyOpts: {
      kind: "transparent",
    },
  })

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
      constructorArgsParams: proxyDeployment.args,
    })
  }
}

export default func

func.tags = ["BaseTMEWC"]
