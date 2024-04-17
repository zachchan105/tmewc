import { deployments, helpers } from "hardhat"
import { expect } from "chai"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import type { OptimismTMEWC, OptimismTMEWCUpgraded } from "../typechain"

describe("OptimismTMEWC - Upgrade", async () => {
  let governance: SignerWithAddress
  let optimismTMEWC: OptimismTMEWC

  before(async () => {
    await deployments.fixture()
    ;({ governance } = await helpers.signers.getNamedSigners())

    optimismTMEWC = (await helpers.contracts.getContract(
      "OptimismTMEWC"
    )) as OptimismTMEWC
  })

  describe("when a new contract is valid", () => {
    let optimismTMEWCUpgraded: OptimismTMEWCUpgraded

    before(async () => {
      const [upgradedContract] = await helpers.upgrades.upgradeProxy(
        "OptimismTMEWC",
        "OptimismTMEWCUpgraded",
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
      optimismTMEWCUpgraded = upgradedContract as OptimismTMEWCUpgraded
    })

    it("new instance should have the same address as the old one", async () => {
      expect(optimismTMEWCUpgraded.address).equal(optimismTMEWC.address)
    })

    it("should initialize new variable", async () => {
      expect(await optimismTMEWCUpgraded.newVar()).to.be.equal(
        "Hello darkness my old friend"
      )
    })

    it("should not update already set name", async () => {
      expect(await optimismTMEWCUpgraded.name()).to.be.equal("Optimism tMEWC")
    })

    it("should not update already set symbol", async () => {
      expect(await optimismTMEWCUpgraded.symbol()).to.be.equal("tMEWC")
    })

    it("should revert when V1's initializer is called", async () => {
      await expect(
        optimismTMEWCUpgraded.initialize("OptimismTMEWC", "OptTMEWC")
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })
})
