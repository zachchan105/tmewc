import { deployments, helpers } from "hardhat"
import { expect } from "chai"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import type { BaseTMEWC, BaseTMEWCUpgraded } from "../typechain"

describe("BaseTMEWC - Upgrade", async () => {
  let governance: SignerWithAddress
  let baseTMEWC: BaseTMEWC

  before(async () => {
    await deployments.fixture()
    ;({ governance } = await helpers.signers.getNamedSigners())

    baseTMEWC = (await helpers.contracts.getContract("BaseTMEWC")) as BaseTMEWC
  })

  describe("when a new contract is valid", () => {
    let baseTMEWCUpgraded: BaseTMEWCUpgraded

    before(async () => {
      const [upgradedContract] = await helpers.upgrades.upgradeProxy(
        "BaseTMEWC",
        "BaseTMEWCUpgraded",
        {
          proxyOpts: {
            call: {
              fn: "initializeV2",
              args: ["Hello darkness my old friend"],
            },
          },
          factoryOpts: {
            signer: governance,
          },
        }
      )
      baseTMEWCUpgraded = upgradedContract as BaseTMEWCUpgraded
    })

    it("new instance should have the same address as the old one", async () => {
      expect(baseTMEWCUpgraded.address).equal(baseTMEWC.address)
    })

    it("should initialize new variable", async () => {
      expect(await baseTMEWCUpgraded.newVar()).to.be.equal(
        "Hello darkness my old friend"
      )
    })

    it("should not update already set name", async () => {
      expect(await baseTMEWCUpgraded.name()).to.be.equal("Base tMEWC")
    })

    it("should not update already set symbol", async () => {
      expect(await baseTMEWCUpgraded.symbol()).to.be.equal("tMEWC")
    })

    it("should revert when V1's initializer is called", async () => {
      await expect(
        baseTMEWCUpgraded.initialize("BaseTMEWC", "BaseTMEWC")
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })
})
