const { expect } = require("chai")
const {
  resetFork,
  to1e18,
  impersonateAccount,
} = require("../helpers/contract-test-helpers.js")
const { BigNumber } = ethers
const { yearn, tmewc, forkBlockNumber } = require("./constants.js")
const { deployYearnVault } = require("./functions.js")
const { saddleStrategyFixture } = require("./fixtures.js")

const describeFn =
  process.env.NODE_ENV === "system-test" ? describe : describe.skip

describeFn("System -- saddle strategy migrate", () => {
  let vaultGovernance
  let vaultDepositor
  let saddleLPRewardsGovernance
  let rewardDistribution
  let keepToken
  let saddleLPRewards
  let tmewcSaddlePoolLPToken
  let vault
  let oldStrategy
  let newStrategy

  before(async () => {
    await resetFork(forkBlockNumber)

    // Setup roles.
    vaultGovernance = await ethers.getSigner(0)

    vaultDepositor = await impersonateAccount(
      tmewc.saddlePoolLPTokenHolderAddress,
      vaultGovernance
    )

    saddleLPRewardsGovernance = await impersonateAccount(
      tmewc.saddleLPRewardsOwner,
      vaultGovernance
    )

    rewardDistribution = await impersonateAccount(
      tmewc.keepTokenHolderAddress,
      vaultGovernance
    )

    // Get tMEWC Saddle LP Rewards handle
    saddleLPRewards = await ethers.getContractAt(
      "ILPRewards",
      tmewc.saddleLPRewards
    )

    // Set `gated` to false to allow non-externally-owned accounts to perform
    // staking
    await saddleLPRewards.connect(saddleLPRewardsGovernance).setGated(false)

    // Set reward distribution account that will deposit KEEP tokens
    await saddleLPRewards
      .connect(saddleLPRewardsGovernance)
      .setRewardDistribution(rewardDistribution.address)

    // Get KEEP token handle.
    keepToken = await ethers.getContractAt("IERC20", tmewc.keepTokenAddress)

    // Deposit 100 KEEP tokens as reward
    const amountReward = to1e18(100)
    await keepToken
      .connect(rewardDistribution)
      .approve(saddleLPRewards.address, amountReward)
    await saddleLPRewards
      .connect(rewardDistribution)
      .notifyRewardAmount(amountReward)

    // Get tMEWC Saddle pool LP token handle.
    tmewcSaddlePoolLPToken = await ethers.getContractAt(
      "IERC20",
      tmewc.saddlePoolLPTokenAddress
    )

    // Deploy a new experimental vault accepting tMEWC Saddle pool LP tokens.
    vault = await deployYearnVault(
      yearn,
      saddleStrategyFixture.vaultName,
      saddleStrategyFixture.vaultSymbol,
      tmewcSaddlePoolLPToken,
      vaultGovernance,
      saddleStrategyFixture.vaultDepositLimit
    )

    // Deploy the SaddleStrategy contract.
    const SaddleStrategy = await ethers.getContractFactory("SaddleStrategy")
    oldStrategy = await SaddleStrategy.deploy(
      vault.address,
      tmewc.saddlePoolSwapAddress,
      tmewc.saddleLPRewards
    )
    await oldStrategy.deployed()

    newStrategy = await SaddleStrategy.deploy(
      vault.address,
      tmewc.saddlePoolSwapAddress,
      tmewc.saddleLPRewards
    )
    await newStrategy.deployed()

    // Add SaddleStrategy to the vault.
    await vault.addStrategy(
      oldStrategy.address,
      saddleStrategyFixture.strategyDebtRatio,
      saddleStrategyFixture.strategyMinDebtPerHarvest,
      saddleStrategyFixture.strategyMaxDebtPerHarvest,
      saddleStrategyFixture.strategyPerformanceFee
    )

    // deposit to the vault
    await tmewcSaddlePoolLPToken
      .connect(vaultDepositor)
      .approve(vault.address, saddleStrategyFixture.vaultDepositAmount)
    await vault
      .connect(vaultDepositor)
      .deposit(saddleStrategyFixture.vaultDepositAmount)

    // Harvest just allocates funds for the first time.
    await oldStrategy.harvest()
  })

  describe("initial checks", () => {
    it("should correctly handle the deposit", async () => {
      expect(await vault.totalAssets()).to.be.equal(
        saddleStrategyFixture.vaultDepositAmount
      )
    })

    it("should return zero LP tokens and rewards for the new strategy", async () => {
      expect(await keepToken.balanceOf(newStrategy.address)).to.be.equal(0)
      expect(
        await tmewcSaddlePoolLPToken.balanceOf(newStrategy.address)
      ).to.be.equal(0)
    })

    it("should return true for is active call for the old strategy", async () => {
      expect(await oldStrategy.isActive()).to.be.true
    })

    it("should return false for is active call for the new strategy", async () => {
      expect(await newStrategy.isActive()).to.be.false
    })
  })

  describe("when migration occurs", () => {
    before(async () => {
      await vault
        .connect(vaultGovernance)
        .migrateStrategy(oldStrategy.address, newStrategy.address)
    })

    it("should move LP tokens to the new strategy", async () => {
      expect(
        await tmewcSaddlePoolLPToken.balanceOf(oldStrategy.address)
      ).to.be.equal(0)
      expect(
        await tmewcSaddlePoolLPToken.balanceOf(newStrategy.address)
      ).to.be.equal(saddleStrategyFixture.vaultDepositAmount)
    })

    it("should move reward tokens to the new strategy", async () => {
      expect(await keepToken.balanceOf(oldStrategy.address)).to.be.equal(0)
      expect(await keepToken.balanceOf(newStrategy.address)).to.be.equal(
        BigNumber.from("27247566300912")
      )
    })

    it("should deactivate the old strategy", async () => {
      expect(await oldStrategy.isActive()).to.be.false
    })

    it("should activate the new strategy", async () => {
      expect(await newStrategy.isActive()).to.be.true
    })
  })

  describe("when withdrawal occurs after migration", async () => {
    let amountWithdrawn

    before(async () => {
      const initialBalance = await tmewcSaddlePoolLPToken.balanceOf(
        vaultDepositor.address
      )
      await vault.connect(vaultDepositor).withdraw() // withdraw all shares
      const currentBalance = await tmewcSaddlePoolLPToken.balanceOf(
        vaultDepositor.address
      )
      amountWithdrawn = currentBalance.sub(initialBalance)
    })

    it("should correctly handle the withdrawal", async () => {
      expect(amountWithdrawn).to.be.equal(
        saddleStrategyFixture.vaultDepositAmount
      )
    })
  })
})
