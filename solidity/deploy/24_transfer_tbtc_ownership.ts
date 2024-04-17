import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, helpers } = hre
  const { deployer } = await getNamedAccounts()

  // In unit tests we cover VendingMachine, VendingMachineV2, and TMEWCVault
  // contracts. All those tests require minting TMEWC. To make the test setup
  // easier, we leave the responsibility of transferring the TMEWC ownership
  // to the test. In system tests and on testnet, TMEWCVault is the owner of TMEWC
  // token, just like on v1.0 mainnet, after transferring the ownership from the
  // VendingMachine.
  if (hre.network.name !== "hardhat") {
    const TMEWCVault = await deployments.get("TMEWCVault")
    await helpers.ownable.transferOwnership("TMEWC", TMEWCVault.address, deployer)
  }
}

export default func

func.tags = ["TransferTMEWCOwnership"]
func.dependencies = ["TMEWC", "VendingMachine", "TMEWCVault"]
func.runAtTheEnd = true
