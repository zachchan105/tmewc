import { ethers, waffle, helpers, getUnnamedAccounts } from "hardhat"
import { expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ContractTransaction } from "ethers"
import bridgeFixture from "../fixtures/bridge"

import type { TestERC20, TMEWC, VendingMachineV3 } from "../../typechain"

const { to1e18 } = helpers.number
const { createSnapshot, restoreSnapshot } = helpers.snapshot

describe("VendingMachineV3", () => {
  let tmewcV1: TestERC20
  let tmewcV2: TMEWC
  let vendingMachineV3: VendingMachineV3

  let deployer: SignerWithAddress
  let governance: SignerWithAddress
  let treasuryGuild: SignerWithAddress
  let exchanger: SignerWithAddress
  let thirdParty: SignerWithAddress

  // 50 tMEWC deposited into the VendingMachineV3
  const initialV2Balance = to1e18(50)
  // 50 tMEWC v1 owned by the exchanger
  const initialV1Balance = to1e18(51)

  before(async () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({ deployer } = await waffle.loadFixture(bridgeFixture))
    tmewcV1 = await helpers.contracts.getContract("TMEWCToken")
    tmewcV2 = await helpers.contracts.getContract("TMEWC")
    vendingMachineV3 = await helpers.contracts.getContract("VendingMachineV3")

    const accounts = await getUnnamedAccounts()
    treasuryGuild = await ethers.getSigner(accounts[0])
    exchanger = await ethers.getSigner(accounts[1])
    thirdParty = await ethers.getSigner(accounts[2])
    ;({ governance } = await helpers.signers.getNamedSigners())
  })

  describe("exchange", () => {
    before(async () => {
      await createSnapshot()
      await tmewcV2
        .connect(deployer)
        .mint(vendingMachineV3.address, initialV2Balance)
      await tmewcV1.connect(deployer).mint(exchanger.address, initialV1Balance)
    })

    after(async () => {
      await restoreSnapshot()
    })

    context("when tMEWC v1 exchanger has not enough tokens", () => {
      before(async () => {
        await createSnapshot()
        // The main test `before` mints `initialV2Balance`. We mint more for
        // this test so that the VendingMachine has enough tokens to exchange
        // `initialV1Balance.add(1)` (see the test)
        await tmewcV2
          .connect(deployer)
          .mint(vendingMachineV3.address, initialV2Balance) // twice the original
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should revert", async () => {
        const amount = initialV1Balance.add(1)
        await tmewcV1
          .connect(exchanger)
          .approve(vendingMachineV3.address, amount)
        await expect(
          vendingMachineV3.connect(exchanger).exchange(amount)
        ).to.be.revertedWith("Transfer amount exceeds balance")
      })
    })

    context("when not enough tMEWC was deposited", () => {
      it("should revert", async () => {
        const amount = initialV2Balance.add(1)
        await tmewcV1
          .connect(exchanger)
          .approve(vendingMachineV3.address, amount)
        await expect(
          vendingMachineV3.connect(exchanger).exchange(amount)
        ).to.be.revertedWith(
          "Not enough tMEWC available in the Vending Machine"
        )
      })
    })

    context("when exchanging entire allowance", () => {
      // initialV1Balance > initialV2Balance for the sake of the negative path
      // unit tests; we take v1 balance to not revert the TX with
      // "Not enough tMEWC available in the Vending Machine"
      const amount = initialV2Balance
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        await tmewcV1
          .connect(exchanger)
          .approve(vendingMachineV3.address, amount)
        tx = await vendingMachineV3.connect(exchanger).exchange(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should exchange the same amount of tMEWC", async () => {
        expect(await tmewcV2.balanceOf(exchanger.address)).is.equal(amount)
      })

      it("should transfer tMEWC v1 tokens to the VendingMachineV3", async () => {
        expect(await tmewcV1.balanceOf(vendingMachineV3.address)).is.equal(
          amount
        )
      })

      it("should emit Exchanged event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV3, "Exchanged")
          .withArgs(exchanger.address, amount)
      })
    })

    context("when exchanging part of the allowance", () => {
      // initialV1Balance > initialV2Balance for the sake of the negative path
      // unit tests; we take v1 balance to not revert the TX with
      // "Not enough tMEWC available in the Vending Machine"
      const amount = initialV2Balance.sub(to1e18(1))
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        await tmewcV1
          .connect(exchanger)
          .approve(vendingMachineV3.address, amount.add(to1e18(1)))
        tx = await vendingMachineV3.connect(exchanger).exchange(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should exchange the same amount of tMEWC", async () => {
        expect(await tmewcV2.balanceOf(exchanger.address)).is.equal(amount)
      })

      it("should transfer tMEWC v1 tokens to the VendingMachineV3", async () => {
        expect(await tmewcV1.balanceOf(vendingMachineV3.address)).is.equal(
          amount
        )
      })

      it("should emit Exchanged event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV3, "Exchanged")
          .withArgs(exchanger.address, amount)
      })
    })
  })

  describe("receiveApproval", () => {
    before(async () => {
      await createSnapshot()
      await tmewcV2
        .connect(deployer)
        .mint(vendingMachineV3.address, initialV2Balance)
      await tmewcV1.connect(deployer).mint(exchanger.address, initialV1Balance)
    })

    after(async () => {
      await restoreSnapshot()
    })

    context("when called directly", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV3
            .connect(exchanger)
            .receiveApproval(exchanger.address, to1e18(1), tmewcV1.address, [])
        ).to.be.revertedWith("Only tMEWC v1 caller allowed")
      })
    })

    context("when called not for tMEWC v1 token", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV3
            .connect(exchanger)
            .receiveApproval(exchanger.address, to1e18(1), tmewcV2.address, [])
        ).to.be.revertedWith("Token is not tMEWC v1")
      })
    })

    context("when called via approveAndCall", () => {
      const amount = to1e18(2)
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        await tmewcV2.connect(deployer).mint(thirdParty.address, amount)
        tx = await tmewcV1
          .connect(exchanger)
          .approveAndCall(vendingMachineV3.address, amount, [])
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should exchange tMEWC with the caller", async () => {
        expect(await tmewcV2.balanceOf(exchanger.address)).is.equal(amount)
      })

      it("should transfer tMEWC v1 tokens to the VendingMachineV3", async () => {
        expect(await tmewcV1.balanceOf(vendingMachineV3.address)).is.equal(
          amount
        )
      })

      it("should emit Exchanged event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV3, "Exchanged")
          .withArgs(exchanger.address, amount)
      })
    })
  })

  describe("depositTMEWCV2", () => {
    context("when depositing entire allowance", () => {
      const amount = to1e18(21)
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        await tmewcV2.connect(deployer).mint(treasuryGuild.address, amount)
        await tmewcV2
          .connect(treasuryGuild)
          .approve(vendingMachineV3.address, amount)

        tx = await vendingMachineV3.connect(treasuryGuild).depositTmewcV2(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should transfer tMEWC to the VendingMachineV3", async () => {
        expect(await tmewcV2.balanceOf(vendingMachineV3.address)).is.equal(
          amount
        )
      })

      it("should emit Deposited event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV3, "Deposited")
          .withArgs(treasuryGuild.address, amount)
      })
    })

    context("when depositing part of the allowance", () => {
      const amount = to1e18(21)
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        await tmewcV2.connect(deployer).mint(treasuryGuild.address, amount)
        await tmewcV2
          .connect(treasuryGuild)
          .approve(vendingMachineV3.address, amount.add(to1e18(1)))

        tx = await vendingMachineV3.connect(treasuryGuild).depositTmewcV2(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should transfer tMEWC to the VendingMachineV3", async () => {
        expect(await tmewcV2.balanceOf(vendingMachineV3.address)).is.equal(
          amount
        )
      })

      it("should emit Deposited event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV3, "Deposited")
          .withArgs(treasuryGuild.address, amount)
      })
    })
  })

  describe("recoverFunds", () => {
    context("when called by third party", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV3
            .connect(thirdParty)
            .recoverFunds(tmewcV1.address, thirdParty.address, to1e18(1))
        ).to.be.revertedWith("Ownable: caller is not the owner")
        await expect(
          vendingMachineV3
            .connect(thirdParty)
            .recoverFunds(tmewcV2.address, thirdParty.address, to1e18(1))
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the owner", () => {
      context("when recovering tMEWC v1 tokens", () => {
        const amount = to1e18(10)

        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()
          await tmewcV1.connect(deployer).mint(vendingMachineV3.address, amount)
          tx = await vendingMachineV3
            .connect(governance)
            .recoverFunds(tmewcV1.address, thirdParty.address, amount)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should transfer tokens to the recipient", async () => {
          expect(await tmewcV1.balanceOf(thirdParty.address)).is.equal(amount)
        })

        it("should emit FundsRecovered event", async () => {
          await expect(tx)
            .to.emit(vendingMachineV3, "FundsRecovered")
            .withArgs(tmewcV1.address, thirdParty.address, amount)
        })
      })

      context("when recovering tMEWC tokens", () => {
        const amount = to1e18(10)

        before(async () => {
          await createSnapshot()
          await tmewcV2.connect(deployer).mint(vendingMachineV3.address, amount)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should revert", async () => {
          await expect(
            vendingMachineV3
              .connect(governance)
              .recoverFunds(tmewcV2.address, thirdParty.address, amount)
          ).to.be.revertedWith(
            "tMEWC tokens can not be recovered, use withdrawTmewcV2 instead"
          )
        })
      })

      context("when recovering other tokens", () => {
        let randomERC20: TestERC20
        const amount = to1e18(10)

        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          const TestERC20 = await ethers.getContractFactory("TestERC20")
          randomERC20 = await TestERC20.deploy()
          await randomERC20.deployed()

          await randomERC20.mint(vendingMachineV3.address, amount)

          tx = await vendingMachineV3
            .connect(governance)
            .recoverFunds(randomERC20.address, thirdParty.address, amount)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should transfer tokens to the recipient", async () => {
          expect(await randomERC20.balanceOf(thirdParty.address)).is.equal(
            amount
          )
        })

        it("should emit FundsRecovered event", async () => {
          await expect(tx)
            .to.emit(vendingMachineV3, "FundsRecovered")
            .withArgs(randomERC20.address, thirdParty.address, amount)
        })
      })
    })
  })

  describe("withdrawTmewcV2", () => {
    context("when called by a third party", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV3
            .connect(thirdParty)
            .withdrawTmewcV2(thirdParty.address, to1e18(1))
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the owner", () => {
      const v1Amount = to1e18(10)
      const v2Amount = to1e18(12)

      before(async () => {
        await createSnapshot()
        await tmewcV1.connect(deployer).mint(vendingMachineV3.address, v1Amount)
        await tmewcV2.connect(deployer).mint(vendingMachineV3.address, v2Amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      context("when some tMEWC v1 would be unbacked", () => {
        const amount = to1e18(2).add(1)
        it("should revert", async () => {
          await expect(
            vendingMachineV3
              .connect(governance)
              .withdrawTmewcV2(thirdParty.address, amount)
          ).to.be.revertedWith("tMEWC v1 must not be left unbacked")
        })
      })

      context("when all tMEWC v1 would be still backed", () => {
        const amount = to1e18(2)

        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          tx = await vendingMachineV3
            .connect(governance)
            .withdrawTmewcV2(thirdParty.address, amount)
        })

        after(async () => {
          await restoreSnapshot()
        })

        it("should transfer tokens to the recipient", async () => {
          expect(await tmewcV2.balanceOf(thirdParty.address)).is.equal(amount)
        })

        it("should emit TmewcV2Withdrawn event", async () => {
          await expect(tx)
            .to.emit(vendingMachineV3, "TmewcV2Withdrawn")
            .withArgs(thirdParty.address, amount)
        })
      })
    })
  })
})
