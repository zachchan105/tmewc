import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers, getUnnamedAccounts, helpers, waffle } from "hardhat"
import { expect } from "chai"
import { ContractTransaction } from "ethers"
import { FakeContract, smock } from "@defi-wonderland/smock"

import { walletState, constants } from "../fixtures"
import bridgeFixture from "../fixtures/bridge"

import {
  Bank,
  Bridge,
  BridgeStub,
  BridgeGovernance,
  TMEWCVault,
  TMEWC,
  IRelay,
} from "../../typechain"
import { DepositSweepTestData, SingleP2SHDeposit } from "../data/deposit-sweep"

const { createSnapshot, restoreSnapshot } = helpers.snapshot
const { increaseTime, lastBlockTime } = helpers.time
const { impersonateAccount } = helpers.account

describe("TMEWCVault - OptimisticMinting", () => {
  let bridge: Bridge & BridgeStub
  let bridgeGovernance: BridgeGovernance
  let tmewcVault: TMEWCVault
  let tmewc: TMEWC
  let relay: FakeContract<IRelay>

  let deployer: SignerWithAddress
  let governance: SignerWithAddress
  let spvMaintainer: SignerWithAddress

  let minter: SignerWithAddress
  let guardian: SignerWithAddress
  let thirdParty: SignerWithAddress

  // used by bridge.connect(depositor).revealDeposit(fundingTx, depositRevealInfo)
  let depositor: SignerWithAddress
  let fundingTx
  let depositRevealInfo

  // used by bridge.submitDepositSweepProof(sweepTx, sweepProof, mainUtxo)
  let sweepTx
  let sweepProof
  let mainUtxo
  let chainDifficulty: number

  // used by tmewcVault.requestOptimisticMint(fundingTxHash, fundingOutputIndex)
  let fundingTxHash: string
  let fundingOutputIndex: number

  let depositKey: string

  before(async () => {
    const accounts = await getUnnamedAccounts()
    minter = await ethers.getSigner(accounts[0])
    guardian = await ethers.getSigner(accounts[1])
    thirdParty = await ethers.getSigner(accounts[2])

    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({
      deployer,
      governance,
      spvMaintainer,
      relay,
      bridge,
      bridgeGovernance,
      tmewcVault,
      tmewc,
    } = await waffle.loadFixture(bridgeFixture))

    // TMEWC token ownership transfer is not performed in deployment scripts.
    // Check TransferTMEWCOwnership deployment step for more information.
    await tmewc.connect(deployer).transferOwnership(tmewcVault.address)

    // Set up test data needed to reveal a deposit via
    // bridge.connect(depositor).revealDeposit(fundingTx, depositRevealInfo)
    const bitcoinTestData: DepositSweepTestData = JSON.parse(
      JSON.stringify(SingleP2SHDeposit)
    )
    depositor = await impersonateAccount(
      bitcoinTestData.deposits[0].depositor,
      {
        from: governance,
        value: 10,
      }
    )
    fundingTx = bitcoinTestData.deposits[0].fundingTx
    depositRevealInfo = bitcoinTestData.deposits[0].reveal
    depositRevealInfo.vault = tmewcVault.address

    // Set the deposit dust threshold to 0.0001 MEWC, i.e. 100x smaller than
    // the initial value in the Bridge in order to save test Bitcoins.
    // Scaling down deposit TX max fee as well.
    await bridge.setDepositDustThreshold(10000)
    await bridge.setDepositTxMaxFee(2000)
    // Disable the reveal ahead period since refund locktimes are fixed
    // within transactions used in this test suite.
    await bridge.setDepositRevealAheadPeriod(0)

    // Set up test data needed to submit deposit sweep proof via
    // bridge.submitDepositSweepProof(sweepTx, sweepProof, mainUtxo)
    chainDifficulty = bitcoinTestData.chainDifficulty
    sweepTx = bitcoinTestData.sweepTx
    sweepProof = bitcoinTestData.sweepProof
    mainUtxo = bitcoinTestData.mainUtxo

    // Set up test data needed to request optimistic minting via
    // tmewcVault.requestOptimisticMint(fundingTxHash, fundingOutputIndex)
    fundingTxHash = fundingTx.hash
    fundingOutputIndex = depositRevealInfo.fundingOutputIndex

    // Calculate the key of revealed deposit. This value is used in tests so we
    // calculate it once, in the setup.
    depositKey = ethers.utils.solidityKeccak256(
      ["bytes32", "uint32"],
      [fundingTxHash, fundingOutputIndex]
    )

    // Use the BridgeStubs' test utility functions to register a wallet. We do
    // not want to execute the entire DKG in the setup for this test.
    const { walletPubKeyHash } = depositRevealInfo
    await bridge.setWallet(walletPubKeyHash, {
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
    await bridge.setWalletMainUtxo(walletPubKeyHash, mainUtxo)
  })

  describe("requestOptimisticMint", () => {
    context("when called not by a minter", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault
            .connect(thirdParty)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
        ).to.be.revertedWith("Caller is not a minter")
      })
    })

    context("when called by a minter", () => {
      before(async () => {
        await createSnapshot()
        await tmewcVault.connect(governance).addMinter(minter.address)
      })

      after(async () => {
        await restoreSnapshot()
      })

      context("when optimistic minting is paused", () => {
        before(async () => {
          await createSnapshot()
          await tmewcVault.connect(governance).pauseOptimisticMinting()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith("Optimistic minting paused")
        })
      })

      context("when optimistic minting has been already requested", () => {
        before(async () => {
          await createSnapshot()

          await bridge
            .connect(depositor)
            .revealDeposit(fundingTx, depositRevealInfo)
          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith(
            "Optimistic minting already requested for the deposit"
          )
        })
      })

      context("when the deposit has not been revealed", () => {
        it("should revert", async () => {
          await expect(
            tmewcVault.connect(minter).requestOptimisticMint(fundingTxHash, 10)
          ).to.be.revertedWith("The deposit has not been revealed")
        })
      })

      context("when the deposit has been revealed", () => {
        context("when the deposit has been swept", () => {
          before(async () => {
            await createSnapshot()

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, depositRevealInfo)

            // Setting mocks to make the sweeping SPV proof validation pass.
            relay.getPrevEpochDifficulty.returns(chainDifficulty)
            relay.getCurrentEpochDifficulty.returns(chainDifficulty)
            await bridge
              .connect(spvMaintainer)
              .submitDepositSweepProof(
                sweepTx,
                sweepProof,
                mainUtxo,
                tmewcVault.address
              )
          })

          after(async () => {
            relay.getPrevEpochDifficulty.reset()
            relay.getCurrentEpochDifficulty.reset()
            await restoreSnapshot()
          })

          it("should revert", async () => {
            await expect(
              tmewcVault
                .connect(minter)
                .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
            ).to.be.revertedWith("The deposit is already swept")
          })
        })

        context("when the deposit is targeted to another vault", () => {
          before(async () => {
            await createSnapshot()

            const anotherVault = "0x42B2bCa0377cEF0027BF308f2a84343D44338Bd9"

            await bridgeGovernance
              .connect(governance)
              .setVaultStatus(anotherVault, true)

            const revealToAnotherVault = JSON.parse(
              JSON.stringify(depositRevealInfo)
            )
            revealToAnotherVault.vault = anotherVault

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, revealToAnotherVault)
          })

          after(async () => {
            await restoreSnapshot()
          })

          it("should revert", async () => {
            await expect(
              tmewcVault
                .connect(minter)
                .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
            ).to.be.revertedWith("Unexpected vault address")
          })
        })

        context("when all conditions are met", () => {
          let tx: ContractTransaction

          before(async () => {
            await createSnapshot()

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, depositRevealInfo)
            tx = await tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          })

          after(async () => {
            await restoreSnapshot()
          })

          it("should request optimistic minting", async () => {
            const request = await tmewcVault.optimisticMintingRequests(
              depositKey
            )
            expect(request.requestedAt).to.be.equal(await lastBlockTime())
            expect(request.finalizedAt).to.be.equal(0)
          })

          it("should emit an event", async () => {
            await expect(tx)
              .to.emit(tmewcVault, "OptimisticMintingRequested")
              .withArgs(
                minter.address,
                depositKey,
                depositor.address,
                20000 * constants.satoshiMultiplier,
                fundingTxHash,
                fundingOutputIndex
              )
          })
        })
      })
    })
  })

  describe("finalizeOptimisticMint", () => {
    context("when called not by a minter", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault
            .connect(thirdParty)
            .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
        ).to.be.revertedWith("Caller is not a minter")
      })
    })

    context("when called by a minter", () => {
      before(async () => {
        await createSnapshot()
        await tmewcVault.connect(governance).addMinter(minter.address)
      })

      after(async () => {
        await restoreSnapshot()
      })

      context("when optimistic minting is paused", () => {
        before(async () => {
          await createSnapshot()
          await tmewcVault.connect(governance).pauseOptimisticMinting()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith("Optimistic minting paused")
        })
      })

      context("when minting has not been requested", () => {
        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith(
            "Optimistic minting not requested for the deposit"
          )
        })
      })

      context("when the minting delay has not passed yet", () => {
        before(async () => {
          await createSnapshot()

          await bridge
            .connect(depositor)
            .revealDeposit(fundingTx, depositRevealInfo)

          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          await increaseTime((await tmewcVault.optimisticMintingDelay()) - 1)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith("Optimistic minting delay has not passed yet")
        })
      })

      context("when requested minting has been already finalized", () => {
        before(async () => {
          await createSnapshot()

          await bridge
            .connect(depositor)
            .revealDeposit(fundingTx, depositRevealInfo)

          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          await increaseTime(await tmewcVault.optimisticMintingDelay())
          await tmewcVault
            .connect(minter)
            .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith(
            "Optimistic minting already finalized for the deposit"
          )
        })
      })

      context("when the deposit has been already swept", () => {
        before(async () => {
          await createSnapshot()

          await bridge
            .connect(depositor)
            .revealDeposit(fundingTx, depositRevealInfo)

          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          await increaseTime(await tmewcVault.optimisticMintingDelay())

          // Setting mocks to make the sweeping SPV proof validation pass.
          relay.getPrevEpochDifficulty.returns(chainDifficulty)
          relay.getCurrentEpochDifficulty.returns(chainDifficulty)
          await bridge
            .connect(spvMaintainer)
            .submitDepositSweepProof(
              sweepTx,
              sweepProof,
              mainUtxo,
              tmewcVault.address
            )
        })

        after(async () => {
          relay.getPrevEpochDifficulty.reset()
          relay.getCurrentEpochDifficulty.reset()
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith("The deposit is already swept")
        })
      })

      context("when all conditions are met", () => {
        context("when fees are non-zero", () => {
          let tx: ContractTransaction

          before(async () => {
            await createSnapshot()

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, depositRevealInfo)

            await tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
            await increaseTime(await tmewcVault.optimisticMintingDelay())
            tx = await tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          })

          after(async () => {
            await restoreSnapshot()
          })

          // Output value is 20000 sat (0.0002 MEWC).
          // Bridge deposit treasury fee is 0.05% (1/2000).
          // Optimistic minting fee is 0.2% (1/500).
          //
          // Bridge deposit treasury fee: 20000 / 2000 = 10 [sat]
          // Optimistic minting fee: (20000 - 10) * 1e10 / 500 = 399800000000 [1e18]
          // Amount to mint: ((20000 - 10) * 1e10) - 399800000000 = 199500200000000 [1e18]
          //
          // Bridge deposit treasury fee is allocated during the sweep.
          //
          // This all gives:
          //   0.0002 MEWC deposited
          //   0.0000001 MEWC as bridge deposit treasury fee
          //   0.0000003998 as TMEWC optimistic minting fee
          //   0.0001995002 TMEWC minted to the depositor
          //
          //   0.0001995002 + 0.0000003998 + 0.0000001 = 0.0002

          it("should send optimistic mint fee to treasury", async () => {
            expect(
              expect(await tmewc.balanceOf(await bridge.treasury())).to.be.equal(
                399800000000
              )
            )
          })

          it("should mint TMEWC to depositor", async () => {
            // (20000 - 10) * 1e10 - 399800000000 = 199500200000000 [1e18]
            expect(await tmewc.balanceOf(depositor.address)).to.be.equal(
              199500200000000
            )
          })

          it("should incur optimistic mint debt", async () => {
            // (20000 - 10) * 1e10 = 199900000000000 [1e18]
            expect(
              await tmewcVault.optimisticMintingDebt(depositor.address)
            ).to.be.equal(199900000000000)
          })

          it("should mark the request as finalized", async () => {
            const request = await tmewcVault.optimisticMintingRequests(
              depositKey
            )
            expect(request.requestedAt).to.not.be.equal(0)
            expect(request.finalizedAt).to.be.equal(await lastBlockTime())
          })

          it("should emit an event", async () => {
            await expect(tx)
              .to.emit(tmewcVault, "OptimisticMintingFinalized")
              .withArgs(
                minter.address,
                depositKey,
                depositor.address,
                199900000000000
              )
          })
        })

        context("when the optimistic minting fee is zero", () => {
          let tx: ContractTransaction

          before(async () => {
            await createSnapshot()

            await tmewcVault
              .connect(governance)
              .beginOptimisticMintingFeeUpdate(0)
            await increaseTime(86400) // 24h
            await tmewcVault
              .connect(governance)
              .finalizeOptimisticMintingFeeUpdate()

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, depositRevealInfo)

            await tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
            await increaseTime(await tmewcVault.optimisticMintingDelay())
            tx = await tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          })

          after(async () => {
            await restoreSnapshot()
          })

          // Output value is 20000 sat (0.0002 MEWC).
          // Bridge deposit treasury fee is 0.05% (1/2000).
          // Optimistic minting fee is 0.
          //
          // Bridge deposit treasury fee: 20000 / 2000 = 10 [sat]
          // Amount to mint: (20000 - 10) * 1e10 = 199900000000000 [1e18]
          //
          // Bridge deposit treasury fee is allocated during the sweep.
          //
          // This all gives:
          //   0.0002 MEWC deposited
          //   0.0000001 MEWC as bridge deposit treasury fee
          //   0 as TMEWC optimistic minting fee
          //   0.0001999 TMEWC minted to the depositor
          //
          //   0.0000001 + 0.0001999 = 0.0002

          it("should send no optimistic mint fee to treasury", async () => {
            expect(
              expect(await tmewc.balanceOf(await bridge.treasury())).to.be.equal(
                0
              )
            )
          })

          it("should mint TMEWC to depositor", async () => {
            expect(await tmewc.balanceOf(depositor.address)).to.be.equal(
              199900000000000
            )
          })

          it("should incur optimistic mint debt", async () => {
            expect(
              await tmewcVault.optimisticMintingDebt(depositor.address)
            ).to.be.equal(199900000000000)
          })

          it("should mark the request as finalized", async () => {
            const request = await tmewcVault.optimisticMintingRequests(
              depositKey
            )
            expect(request.requestedAt).to.not.be.equal(0)
            expect(request.finalizedAt).to.be.equal(await lastBlockTime())
          })

          it("should emit an event", async () => {
            await expect(tx)
              .to.emit(tmewcVault, "OptimisticMintingFinalized")
              .withArgs(
                minter.address,
                depositKey,
                depositor.address,
                199900000000000
              )
          })
        })

        context("when the bridge deposit treasury fee is zero", async () => {
          let tx: ContractTransaction

          before(async () => {
            await createSnapshot()

            await bridgeGovernance
              .connect(governance)
              .beginDepositTreasuryFeeDivisorUpdate(0)
            await increaseTime(constants.governanceDelay)
            await bridgeGovernance
              .connect(governance)
              .finalizeDepositTreasuryFeeDivisorUpdate()

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, depositRevealInfo)

            await tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
            await increaseTime(await tmewcVault.optimisticMintingDelay())

            tx = await tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          })

          after(async () => {
            await restoreSnapshot()
          })

          // Output value is 20000 sat (0.0002 MEWC).
          // Bridge deposit treasury fee is 0.
          // Optimistic minting fee is 0.2% (1/500).
          //
          // Optimistic minting fee: 20000 * 1e10 / 500 = 400000000000 [1e18]
          // Amount to mint: (20000 * 1e10) - 400000000000 = 199600000000000 [1e18]
          //
          // This all gives:
          //   0.0002 MEWC deposited
          //   0 as bridge deposit treasury fee
          //   0.0000004 TMEWC as optimistic minting fee
          //   0.0001996 TMEWC minted to the depositor
          //
          //   0.0000004 + 0.0001996 = 0.0002

          it("should send optimistic mint fee to treasury", async () => {
            expect(
              expect(await tmewc.balanceOf(await bridge.treasury())).to.be.equal(
                400000000000
              )
            )
          })

          it("should mint TMEWC to depositor", async () => {
            // 20000 * 1e10 - 400000000000 = 199600000000000 [1e18]
            expect(await tmewc.balanceOf(depositor.address)).to.be.equal(
              199600000000000
            )
          })

          it("should incur optimistic mint debt", async () => {
            // 20000 * 1e10 = 200000000000000 [1e18]
            expect(
              await tmewcVault.optimisticMintingDebt(depositor.address)
            ).to.be.equal(200000000000000)
          })

          it("should mark the request as finalized", async () => {
            const request = await tmewcVault.optimisticMintingRequests(
              depositKey
            )
            expect(request.requestedAt).to.not.be.equal(0)
            expect(request.finalizedAt).to.be.equal(await lastBlockTime())
          })

          it("should emit an event", async () => {
            await expect(tx)
              .to.emit(tmewcVault, "OptimisticMintingFinalized")
              .withArgs(
                minter.address,
                depositKey,
                depositor.address,
                200000000000000
              )
          })
        })

        context("when both fees are zero", () => {
          let tx: ContractTransaction

          before(async () => {
            await createSnapshot()

            await bridgeGovernance
              .connect(governance)
              .beginDepositTreasuryFeeDivisorUpdate(0)
            await tmewcVault
              .connect(governance)
              .beginOptimisticMintingFeeUpdate(0)
            await increaseTime(constants.governanceDelay)
            await tmewcVault
              .connect(governance)
              .finalizeOptimisticMintingFeeUpdate()
            await bridgeGovernance
              .connect(governance)
              .finalizeDepositTreasuryFeeDivisorUpdate()

            await bridge
              .connect(depositor)
              .revealDeposit(fundingTx, depositRevealInfo)

            await tmewcVault
              .connect(minter)
              .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
            await increaseTime(await tmewcVault.optimisticMintingDelay())
            tx = await tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          })

          after(async () => {
            await restoreSnapshot()
          })

          // Output value is 20000.
          // Bridge deposit treasury fee is 0.
          // Optimistic minting fee is 0.

          it("should mint TMEWC to depositor", async () => {
            // 20000 * 1e10 = 200000000000000 [1e18]
            expect(await tmewc.balanceOf(depositor.address)).to.be.equal(
              200000000000000
            )
          })

          it("should incur optimistic mint debt", async () => {
            expect(
              await tmewcVault.optimisticMintingDebt(depositor.address)
            ).to.be.equal(200000000000000)
          })

          it("should mark the request as finalized", async () => {
            const request = await tmewcVault.optimisticMintingRequests(
              depositKey
            )
            expect(request.requestedAt).to.not.be.equal(0)
            expect(request.finalizedAt).to.be.equal(await lastBlockTime())
          })

          it("should emit an event", async () => {
            await expect(tx)
              .to.emit(tmewcVault, "OptimisticMintingFinalized")
              .withArgs(
                minter.address,
                depositKey,
                depositor.address,
                200000000000000
              )
          })
        })
      })
    })
  })

  describe("cancelOptimisticMint", () => {
    context("when called not by a guardian", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault
            .connect(thirdParty)
            .cancelOptimisticMint(fundingTxHash, fundingOutputIndex)
        ).to.be.revertedWith("Caller is not a guardian")
      })
    })

    context("when called by a guardian", () => {
      before(async () => {
        await createSnapshot()
        await tmewcVault.connect(governance).addMinter(minter.address)
        await tmewcVault.connect(governance).addGuardian(guardian.address)

        await bridge
          .connect(depositor)
          .revealDeposit(fundingTx, depositRevealInfo)
      })

      after(async () => {
        await restoreSnapshot()
      })

      context("when minting has not been requested", () => {
        it("should revert", async () => {
          await expect(
            tmewcVault.connect(guardian).cancelOptimisticMint(fundingTxHash, 99)
          ).to.be.revertedWith(
            "Optimistic minting not requested for the deposit"
          )
        })
      })

      context("when requested minting has been finalized", () => {
        before(async () => {
          await createSnapshot()

          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)
          await increaseTime(await tmewcVault.optimisticMintingDelay())
          await tmewcVault
            .connect(minter)
            .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault
              .connect(guardian)
              .cancelOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith(
            "Optimistic minting already finalized for the deposit"
          )
        })
      })

      context("when requested minting has not been finalized", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)

          tx = await tmewcVault
            .connect(guardian)
            .cancelOptimisticMint(fundingTxHash, fundingOutputIndex)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should cancel optimistic minting", async () => {
          const request = await tmewcVault.optimisticMintingRequests(depositKey)
          expect(request.requestedAt).to.be.equal(0)
          expect(request.finalizedAt).to.be.equal(0)

          await increaseTime(await tmewcVault.optimisticMintingDelay())
          await expect(
            tmewcVault
              .connect(minter)
              .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)
          ).to.be.revertedWith(
            "Optimistic minting not requested for the deposit"
          )
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "OptimisticMintingCancelled")
            .withArgs(guardian.address, depositKey)
        })
      })
    })
  })

  describe("addMinter", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(minter).addMinter(minter.address)
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      context("when address is not a minter", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          tx = await tmewcVault.connect(governance).addMinter(minter.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should add address as a minter", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isMinter(minter.address)).to.be.true
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "MinterAdded")
            .withArgs(minter.address)
        })
      })

      context("when address is a minter", () => {
        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addMinter(minter.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault.connect(governance).addMinter(minter.address)
          ).to.be.revertedWith("This address is already a minter")
        })
      })

      context("when there are multiple minters", () => {
        const minters = [
          "0x54DeA8194aaF652Cd296B162A2809dd95529f775",
          "0x575E6d8802e7b6A7E8F940640804385D8Bbe2ce0",
          "0x66ac131D339704902aECCaBDf55e15daAE8B238f",
        ]

        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addMinter(minters[0])
          await tmewcVault.connect(governance).addMinter(minters[1])
          await tmewcVault.connect(governance).addMinter(minters[2])
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should add them into the list", async () => {
          expect(await tmewcVault.getMinters()).to.deep.equal(minters)
        })
      })
    })
  })

  describe("removeMinter", () => {
    context("when called not by the governance or a guardian", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).removeMinter(minter.address)
        ).to.be.revertedWith("Caller is not the owner or guardian")
      })
    })

    context("when called by the governance", () => {
      context("when address is a minter", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addMinter(minter.address)
          tx = await tmewcVault.connect(governance).removeMinter(minter.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should take minter role from the address", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isMinter(minter.address)).to.be.false
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "MinterRemoved")
            .withArgs(minter.address)
        })
      })

      context("when address is not a minter", () => {
        it("should revert", async () => {
          await expect(
            tmewcVault.connect(governance).removeMinter(thirdParty.address)
          ).to.be.revertedWith("This address is not a minter")
        })
      })
    })

    context("when called by a guardian", () => {
      context("when address is not a minter", () => {
        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addGuardian(guardian.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault.connect(guardian).removeMinter(thirdParty.address)
          ).to.be.revertedWith("This address is not a minter")
        })
      })

      context("when address is a minter", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addMinter(minter.address)
          await tmewcVault.connect(governance).addGuardian(guardian.address)
          tx = await tmewcVault.connect(guardian).removeMinter(minter.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should take minter role from the address", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isMinter(minter.address)).to.be.false
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "MinterRemoved")
            .withArgs(minter.address)
        })
      })

      context("when there are multiple minters", () => {
        const minters = [
          "0x54DeA8194aaF652Cd296B162A2809dd95529f775",
          "0x575E6d8802e7b6A7E8F940640804385D8Bbe2ce0",
          "0x66ac131D339704902aECCaBDf55e15daAE8B238f",
          "0xF844A3a4dA34fDDf51A0Ec7A0a89d1ed5A105e40",
        ]

        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addMinter(minters[0])
          await tmewcVault.connect(governance).addMinter(minters[1])
          await tmewcVault.connect(governance).addMinter(minters[2])
          await tmewcVault.connect(governance).addMinter(minters[3])
        })

        after(async () => {
          await restoreSnapshot()
        })

        context("when deleting the first minter", () => {
          before(async () => {
            await createSnapshot()
            await tmewcVault.connect(governance).removeMinter(minters[0])
          })

          after(async () => {
            await restoreSnapshot()
          })

          it("should update the minters list", async () => {
            expect(await tmewcVault.getMinters()).to.deep.equal([
              "0xF844A3a4dA34fDDf51A0Ec7A0a89d1ed5A105e40",
              "0x575E6d8802e7b6A7E8F940640804385D8Bbe2ce0",
              "0x66ac131D339704902aECCaBDf55e15daAE8B238f",
            ])
          })
        })

        context("when deleting the last minter", () => {
          before(async () => {
            await createSnapshot()
            await tmewcVault.connect(governance).removeMinter(minters[3])
          })

          after(async () => {
            await restoreSnapshot()
          })

          it("should update the minters list", async () => {
            expect(await tmewcVault.getMinters()).to.deep.equal([
              "0x54DeA8194aaF652Cd296B162A2809dd95529f775",
              "0x575E6d8802e7b6A7E8F940640804385D8Bbe2ce0",
              "0x66ac131D339704902aECCaBDf55e15daAE8B238f",
            ])
          })
        })

        context("when deleting minter from the middle of the list", () => {
          before(async () => {
            await createSnapshot()
            await tmewcVault.connect(governance).removeMinter(minters[1])
          })

          after(async () => {
            await restoreSnapshot()
          })

          it("should update the minters list", async () => {
            expect(await tmewcVault.getMinters()).to.deep.equal([
              "0x54DeA8194aaF652Cd296B162A2809dd95529f775",
              "0xF844A3a4dA34fDDf51A0Ec7A0a89d1ed5A105e40",
              "0x66ac131D339704902aECCaBDf55e15daAE8B238f",
            ])
          })
        })
      })
    })
  })

  describe("addGuardian", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(guardian).addGuardian(guardian.address)
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      context("when address is not a guardian", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          tx = await tmewcVault.connect(governance).addGuardian(guardian.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should add address as a guardian", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isGuardian(guardian.address)).to.be.true
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "GuardianAdded")
            .withArgs(guardian.address)
        })
      })

      context("when address is a guardian", () => {
        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addGuardian(guardian.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault.connect(governance).addGuardian(guardian.address)
          ).to.be.revertedWith("This address is already a guardian")
        })
      })
    })
  })

  describe("removeGuardian", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).removeGuardian(guardian.address)
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      context("when address is a guardian", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcVault.connect(governance).addGuardian(guardian.address)
          tx = await tmewcVault
            .connect(governance)
            .removeGuardian(guardian.address)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should take guardian role from the address", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isGuardian(guardian.address)).to.be.false
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "GuardianRemoved")
            .withArgs(guardian.address)
        })
      })

      context("when address is not a guardian", () => {
        it("should revert", async () => {
          await expect(
            tmewcVault.connect(governance).removeGuardian(guardian.address)
          ).to.be.revertedWith("This address is not a guardian")
        })
      })
    })
  })

  describe("pauseOptimisticMinting", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).pauseOptimisticMinting()
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      context("when optimistic minting is already paused", () => {
        before(async () => {
          await createSnapshot()
          await tmewcVault.connect(governance).pauseOptimisticMinting()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            tmewcVault.connect(governance).pauseOptimisticMinting()
          ).to.be.revertedWith("Optimistic minting already paused")
        })
      })

      context("when optimistic minting is not paused", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()
          tx = await tmewcVault.connect(governance).pauseOptimisticMinting()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should pause optimistic minting", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isOptimisticMintingPaused()).to.be.true
        })

        it("should emit an event", async () => {
          await expect(tx).to.emit(tmewcVault, "OptimisticMintingPaused")
        })
      })
    })
  })

  describe("unpauseOptimisticMinting", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).unpauseOptimisticMinting()
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      context("when optimistic minting is not paused", () => {
        it("should revert", async () => {
          await expect(
            tmewcVault.connect(governance).unpauseOptimisticMinting()
          ).to.be.revertedWith("Optimistic minting is not paused")
        })
      })

      context("when optimistic minting is paused", () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()
          await tmewcVault.connect(governance).pauseOptimisticMinting()
          tx = await tmewcVault.connect(governance).unpauseOptimisticMinting()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should unpause optimistic minting", async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(await tmewcVault.isOptimisticMintingPaused()).to.be.false
        })

        it("should emit an event", async () => {
          await expect(tx).to.emit(tmewcVault, "OptimisticMintingUnpaused")
        })
      })
    })
  })

  describe("beginOptimisticMintingFeeUpdate", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).beginOptimisticMintingFeeUpdate(10)
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        tx = await tmewcVault
          .connect(governance)
          .beginOptimisticMintingFeeUpdate(10)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should not update the optimistic minting fee", async () => {
        expect(await tmewcVault.optimisticMintingFeeDivisor()).to.equal(500)
      })

      it("should start the governance delay timer", async () => {
        expect(
          await tmewcVault.optimisticMintingFeeUpdateInitiatedTimestamp()
        ).to.equal(await lastBlockTime())
      })

      it("should emit an event", async () => {
        await expect(tx)
          .to.emit(tmewcVault, "OptimisticMintingFeeUpdateStarted")
          .withArgs(10)
      })
    })
  })

  describe("finalizeOptimisticMintingFeeUpdate", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).finalizeOptimisticMintingFeeUpdate()
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when the update process is not initiated", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(governance).finalizeOptimisticMintingFeeUpdate()
        ).to.be.revertedWith("Change not initiated")
      })
    })

    context("when the governance delay has not passed", () => {
      before(async () => {
        await createSnapshot()

        await tmewcVault.connect(governance).beginOptimisticMintingFeeUpdate(10)

        await increaseTime(86400 - 60) // 24h - 1m
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should revert", async () => {
        await expect(
          tmewcVault.connect(governance).finalizeOptimisticMintingFeeUpdate()
        ).to.be.revertedWith("Governance delay has not elapsed")
      })
    })

    context(
      "when the update process is initiated and governance delay passed",
      () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcVault
            .connect(governance)
            .beginOptimisticMintingFeeUpdate(15)
          await increaseTime(86400) // 24h
          tx = await tmewcVault
            .connect(governance)
            .finalizeOptimisticMintingFeeUpdate()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should update the optimistic minting fee", async () => {
          expect(await tmewcVault.optimisticMintingFeeDivisor()).to.equal(15)
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "OptimisticMintingFeeUpdated")
            .withArgs(15)
        })

        it("should reset the governance delay timer", async () => {
          expect(
            await tmewcVault.optimisticMintingFeeUpdateInitiatedTimestamp()
          ).to.equal(0)
        })
      }
    )
  })

  describe("beginOptimisticMintingDelayUpdate", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).beginOptimisticMintingDelayUpdate(60)
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the governance", () => {
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        tx = await tmewcVault
          .connect(governance)
          .beginOptimisticMintingDelayUpdate(60)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should not update the optimistic minting delay", async () => {
        expect(await tmewcVault.optimisticMintingDelay()).to.equal(10800) // 3h
      })

      it("should start the governance delay timer", async () => {
        expect(
          await tmewcVault.optimisticMintingDelayUpdateInitiatedTimestamp()
        ).to.equal(await lastBlockTime())
      })

      it("should emit an event", async () => {
        await expect(tx)
          .to.emit(tmewcVault, "OptimisticMintingDelayUpdateStarted")
          .withArgs(60)
      })
    })
  })

  describe("finalizeOptimisticMintingDelayUpdate", () => {
    context("when called not by the governance", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(thirdParty).finalizeOptimisticMintingDelayUpdate()
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when the update process is not initiated", () => {
      it("should revert", async () => {
        await expect(
          tmewcVault.connect(governance).finalizeOptimisticMintingDelayUpdate()
        ).to.be.revertedWith("Change not initiated")
      })
    })

    context("when the governance delay has not passed", () => {
      before(async () => {
        await createSnapshot()

        await tmewcVault
          .connect(governance)
          .beginOptimisticMintingDelayUpdate(60)

        await increaseTime(86400 - 60) // 24h - 1m
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should revert", async () => {
        await expect(
          tmewcVault.connect(governance).finalizeOptimisticMintingDelayUpdate()
        ).to.be.revertedWith("Governance delay has not elapsed")
      })
    })

    context(
      "when the update process is initiated and governance delay passed",
      () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcVault
            .connect(governance)
            .beginOptimisticMintingDelayUpdate(60)
          await increaseTime(86400) // 24h
          tx = await tmewcVault
            .connect(governance)
            .finalizeOptimisticMintingDelayUpdate()
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should update the optimistic minting delay", async () => {
          expect(await tmewcVault.optimisticMintingDelay()).to.equal(60)
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "OptimisticMintingDelayUpdated")
            .withArgs(60)
        })

        it("should reset the governance delay timer", async () => {
          expect(
            await tmewcVault.optimisticMintingDelayUpdateInitiatedTimestamp()
          ).to.equal(0)
        })
      }
    )
  })

  describe("calculateDepositKey", () => {
    before(async () => {
      await createSnapshot()
      await bridge
        .connect(depositor)
        .revealDeposit(fundingTx, depositRevealInfo)
    })

    after(async () => {
      await restoreSnapshot()
    })

    it("should calculate the key as expected", async () => {
      expect(
        await tmewcVault.calculateDepositKey(fundingTxHash, fundingOutputIndex)
      ).to.equal(depositKey)
    })

    it("should calculate the same key as the Bridge", async () => {
      expect((await bridge.deposits(depositKey)).revealedAt).to.equal(
        await lastBlockTime()
      )
    })
  })

  describe("receiveBalanceIncrease", () => {
    context(
      "when the deposit for which optimistic minting was requested gets swept after finalization",
      () => {
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()
          await tmewcVault.connect(governance).addMinter(minter.address)

          await bridge
            .connect(depositor)
            .revealDeposit(fundingTx, depositRevealInfo)
          await tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, fundingOutputIndex)

          await increaseTime(await tmewcVault.optimisticMintingDelay())

          await tmewcVault
            .connect(minter)
            .finalizeOptimisticMint(fundingTxHash, fundingOutputIndex)

          // Setting mocks to make the sweeping SPV proof validation pass.
          relay.getPrevEpochDifficulty.returns(chainDifficulty)
          relay.getCurrentEpochDifficulty.returns(chainDifficulty)
          tx = await bridge
            .connect(spvMaintainer)
            .submitDepositSweepProof(
              sweepTx,
              sweepProof,
              mainUtxo,
              tmewcVault.address
            )
        })

        after(async () => {
          relay.getPrevEpochDifficulty.reset()
          relay.getCurrentEpochDifficulty.reset()
          await restoreSnapshot()
        })

        it("should repay optimistic minting debt", async () => {
          // Deposit output value is 20000.
          // Bridge deposit treasury fee is 0.05% (1/2000).
          // Optimistic minting fee is 0.2% (1/500).
          //
          // Bridge deposit treasury fee: 20000 / 2000 = 10 [sat]
          // Optimistic minting fee: (20000 - 10) * 1e10 / 500 = 399800000000 [1e18]
          //
          // Before the sweep, the debt was equal to the optimistically minted
          // amount: (20000 - 10) * 1e10 = 199900000000000 [1e18].
          //
          // The sum of sweep tx inputs is 20000 [sat]. The output value of
          // the sweep transaction is 18500 [sat] so the Meowcoin transaction fee
          // is 1500 [sat]. There is only one deposit so it incurs the entire
          // Meowcoin transaction fee. Bridge deposit treasury fee is 10 [sat].
          // That means 18500 - 10 = 18490 [sat] is used to repay the optimistic
          // minting debt: 199900000000000 - (18490 * 1e10) = 15000000000000 [1e18].
          //
          // The remaining debt is the Meowcoin transaction fee.
          // Meowcoin transaction fee is unknown at the moment of optimistic
          // minting, we can not deduct it when optimistically minting TMEWC so
          // the optimistic minting debt stay equal to the transaction fee.
          expect(
            await tmewcVault.optimisticMintingDebt(depositor.address)
          ).to.equal(15000000000000)
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(tmewcVault, "OptimisticMintingDebtRepaid")
            .withArgs(depositor.address, 15000000000000)
        })
      }
    )

    context("when multiple deposits gets swept after finalization", () => {
      interface Fixture {
        mockBank: FakeContract<Bank>
        mockBridge: FakeContract<Bridge>
        tmewc: TMEWC
        tmewcVault: TMEWCVault
      }

      // Calls are mocked, so we can use just simple string addresses.
      const depositorAddress = "0xb2Ea9bb14A901fD71A7cf6e7b5bdC62aA2b9F012"
      const treasuryAddress = "0xCb18A2137762706C6b5cCe47A25bE02F699Dfe5e"

      // Setting up two real testnet deposits being swept one after another
      // requires a ton of boilerplate code that is hard to follow and update.
      // Testing multiple-deposits scenarios with mocked bridge is way easier.
      // This function prepares a fixture separate from the main test setup's
      // fixture, just for testing multiple-deposits scenarios.
      const prepareFixture = async function (): Promise<Fixture> {
        const mockBank = await smock.fake<Bank>("Bank")
        const mockBridge = await smock.fake<Bridge>("Bridge")

        mockBridge.treasury.returns(treasuryAddress)

        const TMEWCFactory = await ethers.getContractFactory("TMEWC")
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const tmewc = await TMEWCFactory.connect(deployer).deploy()

        const TMEWCVaultFactory = await ethers.getContractFactory("TMEWCVault")
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const tmewcVault = await TMEWCVaultFactory.connect(deployer).deploy(
          mockBank.address,
          tmewc.address,
          mockBridge.address
        )

        await mockBank.connect(deployer).updateBridge(mockBridge.address)
        await tmewc.connect(deployer).transferOwnership(tmewcVault.address)
        await tmewcVault.connect(deployer).addMinter(minter.address)

        // Fund the `mockBank` account so it's possible to mock sending requests
        // from it.
        await deployer.sendTransaction({
          to: mockBank.address,
          value: ethers.utils.parseEther("100"),
        })

        return {
          mockBank,
          mockBridge,
          tmewc,
          tmewcVault,
        }
      }

      context("when both deposits were optimistically minted", () => {
        let f: Fixture
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()
          f = await prepareFixture()

          const firstDepositID = await tmewcVault.calculateDepositKey(
            fundingTxHash,
            1
          )
          const secondDepositID = await tmewcVault.calculateDepositKey(
            fundingTxHash,
            2
          )
          f.mockBridge.deposits.whenCalledWith(firstDepositID).returns({
            depositor: depositorAddress,
            amount: 1000,
            revealedAt: await lastBlockTime(),
            vault: f.tmewcVault.address,
            treasuryFee: 10,
            sweptAt: 0,
            extraData: ethers.constants.HashZero,
          })
          f.mockBridge.deposits.whenCalledWith(secondDepositID).returns({
            depositor: depositorAddress,
            amount: 2000,
            revealedAt: await lastBlockTime(),
            vault: f.tmewcVault.address,
            treasuryFee: 15,
            sweptAt: 0,
            extraData: ethers.constants.HashZero,
          })

          await f.tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, 1)
          await f.tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, 2)
          await increaseTime(await tmewcVault.optimisticMintingDelay())
          await f.tmewcVault
            .connect(minter)
            .finalizeOptimisticMint(fundingTxHash, 1)
          await f.tmewcVault
            .connect(minter)
            .finalizeOptimisticMint(fundingTxHash, 2)

          tx = await f.tmewcVault
            .connect(f.mockBank.wallet)
            .receiveBalanceIncrease(
              [depositorAddress, depositorAddress],
              [985, 1980]
            )
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should repay optimistic minting debt", async () => {
          // The first deposit has:
          //   a value of 1000 [sat],
          //   a deposit treasury fee of 10 [sat],
          //   an optimistic minting fee of (1000 - 10) * 1e10 / 500 = 19800000000 [1e18].
          //
          // The second deposit has:
          //   a value of 2000 [sat]
          //   a deposit treasury fee of 15 [sat],
          //   an optimistic minting fee of (2000 - 15) * 1e10 / 500 = 39700000000 [1e18].
          //
          // Both were optimistically minted so the debt is:
          // (990 + 1985) * 1e10 = 29750000000000 [1e18].
          //
          // Then, the deposits were swept.
          //
          // We assume a Meowcoin miner fee of 5 [sat] per deposit.
          //
          // With miner fee and deposit treasury fee deducted, the amounts from
          // the deposits were:
          // 1000 - 10 - 5 = 985 [sat]
          // 2000 - 15 - 5 = 1980 [sat]
          //
          // The debt is reduced to 29750000000000 - (985 + 1980) * 1e10 = 100000000000 [1e18].
          expect(
            await f.tmewcVault.optimisticMintingDebt(depositorAddress)
          ).to.equal(100000000000)
        })

        it("should mint the right amount of TMEWC to depositor", async () => {
          // Amount to mint for deposit 1: (1000 - 10) * 1e10 - 19800000000 = 9880200000000 [1e18]
          // Amount to mint for deposit 2: (2000 - 15) * 1e10 - 39700000000 = 19810300000000 [1e18]
          // Total amount to mint: 9880200000000 + 19810300000000 = 29690500000000 [1e18]
          expect(await f.tmewc.balanceOf(depositorAddress)).to.equal(
            29690500000000
          )
        })

        it("should emit an event", async () => {
          // First repay coming from deposit 1: 29750000000000 - 985 * 1e10 = 19900000000000 [1e18]
          await expect(tx)
            .to.emit(f.tmewcVault, "OptimisticMintingDebtRepaid")
            .withArgs(depositorAddress, 19900000000000)

          // Second repay coming from deposit 2: 19900000000000 - 1980 * 1e10 = 100000000000 [1e18]
          await expect(tx)
            .to.emit(f.tmewcVault, "OptimisticMintingDebtRepaid")
            .withArgs(depositorAddress, 100000000000)
        })
      })

      context("when only one deposit was optimistically minted", () => {
        let f: Fixture
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()
          f = await prepareFixture()

          const firstDepositID = await tmewcVault.calculateDepositKey(
            fundingTxHash,
            1
          )
          f.mockBridge.deposits.whenCalledWith(firstDepositID).returns({
            depositor: depositorAddress,
            amount: 1000,
            revealedAt: await lastBlockTime(),
            vault: f.tmewcVault.address,
            treasuryFee: 10,
            sweptAt: 0,
            extraData: ethers.constants.HashZero,
          })

          await f.tmewcVault
            .connect(minter)
            .requestOptimisticMint(fundingTxHash, 1)
          await increaseTime(await tmewcVault.optimisticMintingDelay())
          await f.tmewcVault
            .connect(minter)
            .finalizeOptimisticMint(fundingTxHash, 1)

          tx = await f.tmewcVault
            .connect(f.mockBank.wallet)
            .receiveBalanceIncrease(
              [depositorAddress, depositorAddress],
              [985, 1980]
            )
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should repay optimistic minting debt", async () => {
          // The first deposit has:
          //   a value of 1000 [sat],
          //   a deposit treasury fee of 10 [sat],
          //   an optimistic minting fee of (1000 - 10) * 1e10 / 500 = 19800000000 [1e18].
          //
          // The second deposit has:
          //   a value of 2000 [sat]
          //   a deposit treasury fee of 15 [sat],
          //   an optimistic minting fee of (2000 - 15) * 1e10 / 500 = 39700000000 [1e18].
          //
          // Only the first one got optimistically minted so the debt is:
          // 990 * 1e10 = 9900000000000 [1e18].
          //
          // Then, the deposits were swept.
          //
          // We assume a Meowcoin miner fee of 5 [sat] per deposit.
          //
          // With miner fee and deposit treasury fee deducted, the amounts from
          // the deposits were:
          // 1000 - 10 - 5 = 985 [sat]
          // 2000 - 15 - 5 = 1980 [sat]
          //
          // When the first deposit is swept, the debt is reduced to:
          // 9900000000000 - 985 * 1e10 = 50000000000 [1e18].
          // When the second deposit is swept, the debt is reduced to 0.
          expect(
            await f.tmewcVault.optimisticMintingDebt(depositorAddress)
          ).to.equal(0)
        })

        it("should mint the right amount of TMEWC", async () => {
          // When the second deposit was being swept, the debt was 50000000000 [1e18].
          //
          // During the optimistic minting, (1000 - 10) * 1e10 - 19800000000 =
          // 9880200000000 [1e18] was minted for the depositor.
          //
          // During the first sweep, nothing was minted and the debt was reduced
          // 9900000000000 - 985 * 1e10 = 50000000000 [1e18].
          //
          // During the second sweep, 1980 * 1e10 - 50000000000 = 19750000000000 [1e18]
          // was minted for the depositor.
          //
          // 9880200000000 + 19750000000000 = 29630200000000 [1e18] is minted in total.
          expect(await f.tmewc.balanceOf(depositorAddress)).to.equal(
            29630200000000
          )
        })

        it("should emit an event", async () => {
          await expect(tx)
            .to.emit(f.tmewcVault, "OptimisticMintingDebtRepaid")
            .withArgs(depositorAddress, 50000000000)

          await expect(tx)
            .to.emit(f.tmewcVault, "OptimisticMintingDebtRepaid")
            .withArgs(depositorAddress, 0)
        })
      })
    })
  })
})
