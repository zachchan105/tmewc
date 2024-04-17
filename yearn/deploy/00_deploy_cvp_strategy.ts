import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, helpers } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const TMEWCCurveVault = await deployments.get("TMEWCCurveVault")
  if (!helpers.address.isValid(TMEWCCurveVault.address)) {
    throw new Error(`Invalid TMEWCCurveVault address: ${TMEWCCurveVault.address}`)
  }

  const TMEWCCurvePoolDepositor = await deployments.get("TMEWCCurvePoolDepositor")
  if (!helpers.address.isValid(TMEWCCurvePoolDepositor.address)) {
    throw new Error(
      `Invalid TMEWCCurvePoolDepositor address: ${TMEWCCurvePoolDepositor.address}`
    )
  }

  const TMEWCCurvePoolGauge = await deployments.get("TMEWCCurvePoolGauge")
  if (!helpers.address.isValid(TMEWCCurvePoolGauge.address)) {
    throw new Error(
      `Invalid TMEWCCurvePoolGauge address: ${TMEWCCurvePoolGauge.address}`
    )
  }

  const TMEWCCurvePoolGaugeReward = await deployments.getOrNull(
    "TMEWCCurvePoolGaugeReward"
  )
  if (!TMEWCCurvePoolGaugeReward) {
    log(`Deployment TMEWCCurvePoolGaugeReward not found - using default address`)

    TMEWCCurvePoolGaugeReward.address =
      "0x0000000000000000000000000000000000000000"
  } else if (!helpers.address.isValid(TMEWCCurvePoolGaugeReward.address)) {
    log(
      `Invalid TMEWCCurvePoolGaugeReward address: 
      ${TMEWCCurvePoolGaugeReward.address} - using default address`
    )

    TMEWCCurvePoolGaugeReward.address =
      "0x0000000000000000000000000000000000000000"
  }

  log(`tmewcCurveVault: ${TMEWCCurveVault.address}`)
  log(`tmewcCurvePoolDepositor: ${TMEWCCurvePoolDepositor.address}`)
  log(`tmewcCurvePoolGauge: ${TMEWCCurvePoolGauge.address}`)
  log(`tmewcCurvePoolGaugeReward: ${TMEWCCurvePoolGaugeReward.address}`)

  await deploy("CurveVoterProxyStrategy", {
    from: deployer,
    args: [
      TMEWCCurveVault.address,
      TMEWCCurvePoolDepositor.address,
      TMEWCCurvePoolGauge.address,
      TMEWCCurvePoolGaugeReward.address,
    ],
    log: true,
    gasLimit: parseInt(process.env.GAS_LIMIT) || undefined,
  })
}

export default func

func.tags = ["CurveVoterProxyStrategy"]
