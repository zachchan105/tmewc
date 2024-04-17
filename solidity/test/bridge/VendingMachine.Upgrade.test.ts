import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers, helpers, waffle } from "hardhat"
import { expect } from "chai"
import { FakeContract } from "@defi-wonderland/smock"

import { constants, walletState } from "../fixtures"
import bridgeFixture from "../fixtures/bridge"

import { DepositSweepTestData, SingleP2SHDeposit } from "../data/deposit-sweep"

import type {
  Bank,
  Bridge,
  BridgeStub,
  TMEWC,
  TMEWCVault,
  TestERC20,
  VendingMachine,
  IRelay,
} from "../../typechain"

const { impersonateAccount } = helpers.account

const { to1e18 } = helpers.number
const { increaseTime, lastBlockTime } = helpers.time
const { createSnapshot, restoreSnapshot } = helpers.snapshot

// Test covering `VendingMachine` -> `TMEWCVault` upgrade process.
describe("VendingMachine - Upgrade", () => {
  let deployer: SignerWithAddress
  let governance: SignerWithAddress
  let spvMaintainer: SignerWithAddress
  let keepTechnicalWalletTeam: SignerWithAddress
  let keepCommunityMultiSig: SignerWithAddress

  let account1: SignerWithAddress
  let account2: SignerWithAddress

  let tmewcV1: TestERC20
  let tmewc: TMEWC
  let tmewcVault: TMEWCVault
  let bridge: Bridge & BridgeStub
  let bank: Bank
  let vendingMachine: VendingMachine
  let relay: FakeContract<IRelay>

  before(async () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({
      deployer,
      governance,
      spvMaintainer,
      keepTechnicalWalletTeam,
      keepCommunityMultiSig,
    } = await helpers.signers.getNamedSigners())

    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;[account1, account2] = await helpers.signers.getUnnamedSigners()

    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({ tmewcVault, tmewc, vendingMachine, bank, bridge, relay } =
      await waffle.loadFixture(bridgeFixture))

    // TMEWC token ownership transfer is not performed in deployment scripts.
    // Check TransferTMEWCOwnership deployment step for more information.
    await tmewc.connect(deployer).transferOwnership(vendingMachine.address)

    // Set the deposit dust threshold to 0.0001 MEWC, i.e. 100x smaller than
    // the initial value in the Bridge in order to save test Bitcoins.
    await bridge.setDepositDustThreshold(10000)
    // Disable the reveal ahead period since refund locktimes are fixed
    // within transactions used in this test suite.
    await bridge.setDepositRevealAheadPeriod(0)

    tmewcV1 = await helpers.contracts.getContract("TMEWCToken")
    // Two accounts with 10 TMEWC v1 each wrap their holdings to TMEWC.
    const initialTmewcBalance = to1e18(10)
    await tmewcV1.connect(deployer).mint(account1.address, initialTmewcBalance)
    await tmewcV1.connect(deployer).mint(account2.address, initialTmewcBalance)
    await tmewcV1
      .connect(account1)
      .approveAndCall(vendingMachine.address, initialTmewcBalance, [])
    await tmewcV1
      .connect(account2)
      .approveAndCall(vendingMachine.address, initialTmewcBalance, [])

    await vendingMachine
      .connect(keepTechnicalWalletTeam)
      .initiateVendingMachineUpgrade(tmewcVault.address)
    await increaseTime(await vendingMachine.GOVERNANCE_DELAY())
    await vendingMachine
      .connect(keepCommunityMultiSig)
      .finalizeVendingMachineUpgrade()
  })

  // This is an Option #1 scenario allowing the Governance to withdraw
  // TMEWC v1, unmint TMEWC v1 to MEWC manually and then deposit MEWC back to v2.
  // This scenario creates and imbalance in the system for a moment and implies
  // there is a trusted redeemer.
  //
  // Step #1 - TMEWC v1 transfer, TMEWC ownership transfer
  //   TMEWC v1 is transferred from `VendingMachine` to `TMEWCVault` along with
  //   TMEWC token ownership.
  //
  // Step #2 - TMEWC v1 withdrawal
  //   Governance withdraws TMEWC v1 from `VendingMachine` *somewhere*.
  //   Governance unmints TMEWC v1 to MEWC *somehow*.
  //
  // Step #3 - MEWC deposits
  //   Governance deposits MEWC to `TMEWCVault`.
  //
  // Step #4 - functioning system
  //   The system works. Users can mint and unmint TMEWC.
  describe("upgrade process - option #1", () => {
    before(async () => {
      await createSnapshot()
    })

    after(async () => {
      await restoreSnapshot()
    })

    // Two accounts with 10 TMEWC v1 each wrap their holdings to TMEWC.
    // See the main `before`.
    const totalTmewcV1Balance = to1e18(20)

    describe("step#1 - TMEWC v1 transfer", () => {
      it("should transfer all TMEWC v1 to TMEWCVault", async () => {
        expect(await tmewcV1.balanceOf(vendingMachine.address)).to.equal(
          to1e18(0)
        )
        expect(await tmewcV1.balanceOf(tmewcVault.address)).to.equal(
          totalTmewcV1Balance
        )
      })
    })

    describe("step#2 - TMEWC v1 withdrawal", () => {
      it("should let the governance withdraw TMEWC v1 from TMEWCVault", async () => {
        await tmewcVault
          .connect(governance)
          .recoverERC20(tmewcV1.address, governance.address, totalTmewcV1Balance)
        expect(await tmewcV1.balanceOf(tmewcVault.address)).to.equal(0)
        expect(await tmewcV1.balanceOf(governance.address)).to.equal(
          totalTmewcV1Balance
        )
      })
    })

    describe("step#3 - MEWC deposit", () => {
      before(async () => {
        const data: DepositSweepTestData = JSON.parse(
          JSON.stringify(SingleP2SHDeposit)
        )
        const { fundingTx, depositor, reveal } = data.deposits[0] // it's a single deposit
        reveal.vault = tmewcVault.address

        // Simulate the wallet is a Live one and is known in the system.
        await bridge.setWallet(reveal.walletPubKeyHash, {
          ecdsaWalletID: ethers.constants.HashZero,
          mainUtxoHash: ethers.constants.HashZero,
          pendingRedemptionsValue: 0,
          createdAt: await lastBlockTime(),
          movingFundsRequestedAt: 0,
          closingStartedAt: 0,
          pendingMovedFundsSweepRequestsCount: 0,
          state: walletState.Live,
          movingFundsTargetWalletsCommitmentHash: ethers.constants.HashZero,
        })

        const depositorSigner = await impersonateAccount(depositor, {
          from: governance,
          value: 10,
        })
        await bridge.connect(depositorSigner).revealDeposit(fundingTx, reveal)

        relay.getCurrentEpochDifficulty.returns(data.chainDifficulty)
        relay.getPrevEpochDifficulty.returns(data.chainDifficulty)

        await bridge
          .connect(spvMaintainer)
          .submitDepositSweepProof(
            data.sweepTx,
            data.sweepProof,
            data.mainUtxo,
            tmewcVault.address
          )
      })

      it("should let the governance donate TMEWCVault", async () => {
        // The sum of sweep tx inputs is 20000 satoshi. The output
        // value is 18500 so the transaction fee is 1500. There is
        // only one deposit so it incurs the entire transaction fee.
        // The deposit should also incur the treasury fee whose
        // initial value is 0.05% of the deposited amount so the
        // final depositor balance should be cut by 10 satoshi.
        const totalWalletBtcBalance = 18490

        expect(await bank.balanceOf(tmewcVault.address)).to.equal(
          totalWalletBtcBalance
        )

        // Governance should burn the minted TMEWC so not checking the
        // amount.
      })
    })

    describe("step#4 - functioning system", () => {
      it("should let TMEWC holders unmint their tokens", async () => {
        const initialWalletBtcBalance = 18490 // [sat]
        // Bank balances are denominated in satoshi
        const unmintedBankBalance1 = 7000 // [sat]
        const unmintedBankBalance2 = 1000 // [sat]
        // Values in satoshi need to be multiplied by 1e10 (satoshi multiplier)
        // to be represented in 1e18 (Ethereum) precision.
        const unmintedAmount1 =
          unmintedBankBalance1 * constants.satoshiMultiplier
        const unmintedAmount2 =
          unmintedBankBalance2 * constants.satoshiMultiplier

        await tmewc.connect(account1).approve(tmewcVault.address, unmintedAmount1)
        await tmewcVault.connect(account1).unmint(unmintedAmount1)

        await tmewc.connect(account2).approve(tmewcVault.address, unmintedAmount2)
        await tmewcVault.connect(account2).unmint(unmintedAmount2)

        expect(await bank.balanceOf(account1.address)).to.equal(
          unmintedBankBalance1
        )
        expect(await bank.balanceOf(account2.address)).to.equal(
          unmintedBankBalance2
        )
        expect(await bank.balanceOf(tmewcVault.address)).to.equal(
          initialWalletBtcBalance - unmintedBankBalance1 - unmintedBankBalance2
        )
      })

      it("should let Bank balance holders mint TMEWC", async () => {
        const initialWalletBtcBalance = 10490 // 18490 - 7000 - 1000 [sat]
        // Bank balances are denominated in satoshi
        const mintedBankBalance1 = 600 // [sat]
        const mintedBankBalance2 = 100 // [sat]
        // Values in satoshi need to be multiplied by 1e10 (satoshi multiplier)
        // to be represented in 1e18 (Ethereum) precision.
        const mintedAmount1 = mintedBankBalance1 * constants.satoshiMultiplier
        const mintedAmount2 = mintedBankBalance2 * constants.satoshiMultiplier

        const initialTmewcBalance1 = await tmewc.balanceOf(account1.address)
        const initialTmewcBalance2 = await tmewc.balanceOf(account2.address)

        await bank
          .connect(account1)
          .approveBalance(tmewcVault.address, mintedAmount1)
        await tmewcVault.connect(account1).mint(mintedAmount1)

        await bank
          .connect(account2)
          .approveBalance(tmewcVault.address, mintedAmount2)
        await tmewcVault.connect(account2).mint(mintedAmount2)

        expect(await tmewc.balanceOf(account1.address)).to.equal(
          initialTmewcBalance1.add(mintedAmount1)
        )
        expect(await tmewc.balanceOf(account2.address)).to.equal(
          initialTmewcBalance2.add(mintedAmount2)
        )
        expect(await bank.balanceOf(tmewcVault.address)).to.equal(
          initialWalletBtcBalance + mintedBankBalance1 + mintedBankBalance2
        )
      })
    })
  })

  // This is an Option #2 scenario based on the Agoristen's proposal from
  // https://forum.threshold.network/t/tip-027b-tmewc-v1-the-sunsettening/357/20
  //
  // In this scenario, Redeemer mints TMEWC with their own MEWC. Then, they
  // unwrap back to TMEWC v1 and redeem MEWC from the v1 system.
  //
  // Step #1 - TMEWC v1 transfer, TMEWC ownership transfer
  //   TMEWC v1 is transferred from `VendingMachine` to `TMEWCVault` along with
  //   TMEWC token ownership.
  //
  // Step #2 - TMEWC v1 transfer back
  //   TMEWC v1 is transferred back to `VendingMachine` from the `TMEWCVault`.
  //
  // Step #3 - MEWC deposits
  //   The v2 depositor (v1 redeemer) deposits MEWC to the v2 system to mint
  //   TMEWC.
  //
  // Step #4 - TMEWC v1 redemption
  //   The v2 depositor (v1 redeemer) unwraps TMEWC v1 from TMEWC via
  //   `VendingMachine` and use TMEWC v1 for the v1 system redemption.
  describe("upgrade process - option #2", () => {
    // Two accounts with 10 TMEWC v1 each wrap their holdings to TMEWC.
    // See the main `before`.
    const totalTmewcV1Balance = to1e18(20)

    let depositData: DepositSweepTestData
    let redeemer: SignerWithAddress

    before(async () => {
      await createSnapshot()

      depositData = JSON.parse(JSON.stringify(SingleP2SHDeposit))

      // In this scenario, depositor of MEWC into the v2 Bridge is the v1
      // redeemer responsible for unwrapping TMEWC back to TMEWC v1 and then
      // using the TMEWC v1 to perform MEWC redemption.
      //
      // This account:
      // - from the perspective of v2 Bridge is a MEWC depositor,
      // - from the perspective of v1 Bridge is a MEWC redeemer.
      const { depositor } = depositData.deposits[0] // it's a single deposit
      redeemer = await impersonateAccount(depositor, {
        from: governance,
        value: 10,
      })
    })

    after(async () => {
      await restoreSnapshot()
    })

    describe("step#1 - TMEWC v1 transfer", () => {
      it("should transfer all TMEWC v1 to TMEWCVault", async () => {
        expect(await tmewcV1.balanceOf(vendingMachine.address)).to.equal(
          to1e18(0)
        )
        expect(await tmewcV1.balanceOf(tmewcVault.address)).to.equal(
          totalTmewcV1Balance
        )
      })
    })

    describe("step#2 - TMEWC v1 transfer back to VendingMachine", () => {
      it("should let the governance transfer TMEWC v1 back to VendingMachine", async () => {
        await tmewcVault
          .connect(governance)
          .recoverERC20(
            tmewcV1.address,
            vendingMachine.address,
            totalTmewcV1Balance
          )

        expect(await tmewcV1.balanceOf(vendingMachine.address)).to.equal(
          totalTmewcV1Balance
        )
        expect(await tmewcV1.balanceOf(tmewcVault.address)).to.equal(0)
      })
    })

    describe("step #3 - MEWC deposit", () => {
      before(async () => {
        const { fundingTx, reveal } = depositData.deposits[0] // it's a single deposit
        reveal.vault = tmewcVault.address

        // Simulate the wallet is a Live one and is known in the system.
        await bridge.setWallet(reveal.walletPubKeyHash, {
          ecdsaWalletID: ethers.constants.HashZero,
          mainUtxoHash: ethers.constants.HashZero,
          pendingRedemptionsValue: 0,
          createdAt: await lastBlockTime(),
          movingFundsRequestedAt: 0,
          closingStartedAt: 0,
          pendingMovedFundsSweepRequestsCount: 0,
          state: walletState.Live,
          movingFundsTargetWalletsCommitmentHash: ethers.constants.HashZero,
        })

        await bridge.connect(redeemer).revealDeposit(fundingTx, reveal)

        relay.getCurrentEpochDifficulty.returns(depositData.chainDifficulty)
        relay.getPrevEpochDifficulty.returns(depositData.chainDifficulty)

        await bridge
          .connect(spvMaintainer)
          .submitDepositSweepProof(
            depositData.sweepTx,
            depositData.sweepProof,
            depositData.mainUtxo,
            tmewcVault.address
          )
      })

      // The sum of sweep tx inputs is 20000 satoshi. The output
      // value is 18500 so the transaction fee is 1500. There is
      // only one deposit so it incurs the entire transaction fee.
      // The deposit should also incur the treasury fee whose
      // initial value is 0.05% of the deposited amount so the
      // final depositor balance should be cut by 10 satoshi.
      const totalWalletBtcBalance = 18490
      const totalTmewcMinted =
        totalWalletBtcBalance * constants.satoshiMultiplier

      it("should let to deposit MEWC into v2 Bridge", async () => {
        expect(await bank.balanceOf(tmewcVault.address)).to.equal(
          totalWalletBtcBalance
        )
        expect(await tmewc.balanceOf(redeemer.address)).to.equal(totalTmewcMinted)
      })

      describe("step #4 - TMEWC -> v2 unminting", () => {
        it("should let the redeemer to unmint TMEWC back to TMEWC v1", async () => {
          expect(await tmewcV1.balanceOf(redeemer.address)).to.equal(0)
          expect(await tmewc.balanceOf(redeemer.address)).to.equal(
            totalTmewcMinted
          )

          await tmewc
            .connect(redeemer)
            .approve(vendingMachine.address, totalTmewcMinted)
          await vendingMachine.connect(redeemer).unmint(totalTmewcMinted)

          expect(await tmewcV1.balanceOf(redeemer.address)).to.equal(
            totalTmewcMinted
          )
          expect(await tmewc.balanceOf(redeemer.address)).to.equal(0)
        })
      })
    })
  })
})
