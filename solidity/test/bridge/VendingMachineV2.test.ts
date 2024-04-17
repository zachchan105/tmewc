import { ethers, waffle, helpers, getUnnamedAccounts } from "hardhat"
import { expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ContractTransaction } from "ethers"
import bridgeFixture from "../fixtures/bridge"

import type { TestERC20, TMEWC, VendingMachineV2 } from "../../typechain"

const { to1e18 } = helpers.number
const { createSnapshot, restoreSnapshot } = helpers.snapshot

describe("VendingMachineV2", () => {
  let tmewcV1: TestERC20
  let tmewcV2: TMEWC
  let vendingMachineV2: VendingMachineV2

  let deployer: SignerWithAddress
  let v1Redeemer: SignerWithAddress
  let exchanger: SignerWithAddress
  let thirdParty: SignerWithAddress

  // 50 tMEWC deposited into the VendingMachineV2
  const initialV2Balance = to1e18(50)
  // 50 tMEWC v1 owned by the exchanger
  const initialV1Balance = to1e18(51)

  before(async () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({ deployer } = await waffle.loadFixture(bridgeFixture))
    tmewcV1 = await helpers.contracts.getContract("TMEWCToken")
    tmewcV2 = await helpers.contracts.getContract("TMEWC")
    vendingMachineV2 = await helpers.contracts.getContract("VendingMachineV2")

    const accounts = await getUnnamedAccounts()
    exchanger = await ethers.getSigner(accounts[1])
    thirdParty = await ethers.getSigner(accounts[2])
    ;({ v1Redeemer } = await helpers.signers.getNamedSigners())

    await tmewcV2
      .connect(deployer)
      .mint(vendingMachineV2.address, initialV2Balance)
    await tmewcV1.connect(deployer).mint(exchanger.address, initialV1Balance)
  })

  describe("exchange", () => {
    context("when tMEWC v1 exchanger has not enough tokens", () => {
      before(async () => {
        await createSnapshot()
        // The main test `before` mints `initialV2Balance`. We mint more for
        // this test so that the VendingMachine has enough tokens to exchange
        // `initialV1Balance.add(1)` (see the test)
        await tmewcV2
          .connect(deployer)
          .mint(vendingMachineV2.address, initialV2Balance) // twice the original
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should revert", async () => {
        const amount = initialV1Balance.add(1)
        await tmewcV1
          .connect(exchanger)
          .approve(vendingMachineV2.address, amount)
        await expect(
          vendingMachineV2.connect(exchanger).exchange(amount)
        ).to.be.revertedWith("Transfer amount exceeds balance")
      })
    })

    context("when not enough tMEWC was deposited", () => {
      it("should revert", async () => {
        const amount = initialV2Balance.add(1)
        await tmewcV1
          .connect(exchanger)
          .approve(vendingMachineV2.address, amount)
        await expect(
          vendingMachineV2.connect(exchanger).exchange(amount)
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
          .approve(vendingMachineV2.address, amount)
        tx = await vendingMachineV2.connect(exchanger).exchange(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should exchange the same amount of tMEWC", async () => {
        expect(await tmewcV2.balanceOf(exchanger.address)).is.equal(amount)
      })

      it("should transfer tMEWC v1 tokens to the VendingMachineV2", async () => {
        expect(await tmewcV1.balanceOf(vendingMachineV2.address)).is.equal(
          amount
        )
      })

      it("should emit Exchanged event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV2, "Exchanged")
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
          .approve(vendingMachineV2.address, amount.add(to1e18(1)))
        tx = await vendingMachineV2.connect(exchanger).exchange(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should exchange the same amount of tMEWC", async () => {
        expect(await tmewcV2.balanceOf(exchanger.address)).is.equal(amount)
      })

      it("should transfer tMEWC v1 tokens to the VendingMachineV2", async () => {
        expect(await tmewcV1.balanceOf(vendingMachineV2.address)).is.equal(
          amount
        )
      })

      it("should emit Exchanged event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV2, "Exchanged")
          .withArgs(exchanger.address, amount)
      })
    })
  })

  describe("receiveApproval", () => {
    context("when called directly", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV2
            .connect(exchanger)
            .receiveApproval(exchanger.address, to1e18(1), tmewcV1.address, [])
        ).to.be.revertedWith("Only tMEWC v1 caller allowed")
      })
    })

    context("when called not for tMEWC v1 token", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV2
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
          .approveAndCall(vendingMachineV2.address, amount, [])
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should exchange tMEWC with the caller", async () => {
        expect(await tmewcV2.balanceOf(exchanger.address)).is.equal(amount)
      })

      it("should transfer tMEWC v1 tokens to the VendingMachineV2", async () => {
        expect(await tmewcV1.balanceOf(vendingMachineV2.address)).is.equal(
          amount
        )
      })

      it("should emit Exchanged event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV2, "Exchanged")
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

        await tmewcV2.connect(deployer).mint(v1Redeemer.address, amount)
        await tmewcV2
          .connect(v1Redeemer)
          .approve(vendingMachineV2.address, amount)

        tx = await vendingMachineV2.connect(v1Redeemer).depositTmewcV2(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should transfer tMEWC to the VendingMachineV2", async () => {
        expect(await tmewcV2.balanceOf(vendingMachineV2.address)).is.equal(
          initialV2Balance.add(amount)
        )
      })

      it("should emit Deposited event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV2, "Deposited")
          .withArgs(v1Redeemer.address, amount)
      })
    })

    context("when depositing part of the allowance", () => {
      const amount = to1e18(21)
      let tx: ContractTransaction

      before(async () => {
        await createSnapshot()

        await tmewcV2.connect(deployer).mint(v1Redeemer.address, amount)
        await tmewcV2
          .connect(v1Redeemer)
          .approve(vendingMachineV2.address, amount.add(to1e18(1)))

        tx = await vendingMachineV2.connect(v1Redeemer).depositTmewcV2(amount)
      })

      after(async () => {
        await restoreSnapshot()
      })

      it("should transfer tMEWC to the VendingMachineV2", async () => {
        expect(await tmewcV2.balanceOf(vendingMachineV2.address)).is.equal(
          initialV2Balance.add(amount)
        )
      })

      it("should emit Deposited event", async () => {
        await expect(tx)
          .to.emit(vendingMachineV2, "Deposited")
          .withArgs(v1Redeemer.address, amount)
      })
    })
  })

  describe("withdrawFunds", () => {
    context("when called by third party", () => {
      it("should revert", async () => {
        await expect(
          vendingMachineV2
            .connect(thirdParty)
            .withdrawFunds(tmewcV1.address, thirdParty.address, to1e18(1))
        ).to.be.revertedWith("Ownable: caller is not the owner")
        await expect(
          vendingMachineV2
            .connect(thirdParty)
            .withdrawFunds(tmewcV2.address, thirdParty.address, to1e18(1))
        ).to.be.revertedWith("Ownable: caller is not the owner")
      })
    })

    context("when called by the owner", () => {
      context("when withdrawing tMEWC v1 tokens", () => {
        const amount = to1e18(10)
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcV1.connect(deployer).mint(vendingMachineV2.address, amount)

          tx = await vendingMachineV2
            .connect(v1Redeemer)
            .withdrawFunds(tmewcV1.address, thirdParty.address, amount)
        })

        it("should transfer tokens to the recipient", async () => {
          expect(await tmewcV1.balanceOf(thirdParty.address)).is.equal(amount)
        })

        it("should emit Withdrawn event", async () => {
          await expect(tx)
            .to.emit(vendingMachineV2, "Withdrawn")
            .withArgs(tmewcV1.address, thirdParty.address, amount)
        })
      })

      context("when withdrawing tMEWC tokens", () => {
        const amount = to1e18(11)
        let tx: ContractTransaction

        before(async () => {
          await createSnapshot()

          await tmewcV2.connect(deployer).mint(vendingMachineV2.address, amount)

          tx = await vendingMachineV2
            .connect(v1Redeemer)
            .withdrawFunds(tmewcV2.address, thirdParty.address, amount)
        })

        it("should transfer tokens to the recipient", async () => {
          expect(await tmewcV2.balanceOf(thirdParty.address)).is.equal(amount)
        })

        it("should emit Withdrawn event", async () => {
          await expect(tx)
            .to.emit(vendingMachineV2, "Withdrawn")
            .withArgs(tmewcV2.address, thirdParty.address, amount)
        })
      })
    })
  })
})
