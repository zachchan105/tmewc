const { to1e18, to1ePrecision } = require("../helpers/contract-test-helpers.js")
const { BigNumber } = ethers

module.exports.curveStrategyFixture = {
  // Name of the vault for tMEWC Curve pool.
  vaultName: "Curve tMEWC Pool yVault",
  // Symbol of the vault for tMEWC Curve pool.
  vaultSymbol: "yvCurve-tMEWC",
  // Total deposit limit of the vault for tMEWC Curve pool.
  vaultDepositLimit: to1ePrecision(300, 15), // 0.3
  // Amount of the deposit made by the depositor.
  vaultDepositAmount: to1ePrecision(300, 15), // 0.3
  // Amount of Synthetix staking rewards which should be allocated.
  synthetixRewardsAllocation: to1e18(100000), // 100k
  // The share of the total assets in the vault that the strategy has access to.
  strategyDebtRatio: 10000, // 100%
  // Lower limit on the increase of debt since last harvest.
  strategyMinDebtPerHarvest: 0,
  // Upper limit on the increase of debt since last harvest.
  strategyMaxDebtPerHarvest: BigNumber.from(2).pow(256).sub(1), // infinite
  // The fee the strategist will receive based on this Vault's performance.
  strategyPerformanceFee: 1000, // 10%
}

module.exports.saddleStrategyFixture = {
  // Name of the vault for tMEWC Saddle pool.
  vaultName: "Saddle tMEWC Pool yVault",
  // Symbol of the vault for tMEWC Saddle pool.
  vaultSymbol: "yvSaddle-tMEWC",
  // Total deposit limit of the vault for tMEWC Saddle pool.
  vaultDepositLimit: to1ePrecision(300, 15), // 0.3
  // Amount of the deposit made by the depositor.
  vaultDepositAmount: to1ePrecision(300, 15), // 0.3
  // The share of the total assets in the vault that the strategy has access to.
  strategyDebtRatio: 10000, // 100%
  // Lower limit on the increase of debt since last harvest.
  strategyMinDebtPerHarvest: 0,
  // Upper limit on the increase of debt since last harvest.
  strategyMaxDebtPerHarvest: BigNumber.from(2).pow(256).sub(1), // infinite
  // The fee the strategist will receive based on this Vault's performance.
  strategyPerformanceFee: 1000, // 10%
}
