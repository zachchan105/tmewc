import { deployments, helpers } from "hardhat"
import { expect } from "chai"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import type { ArbitrumTMEWC, ArbitrumTMEWCUpgraded } from "../typechain"

describe("ArbitrumTMEWC - Upgrade", async () => {
  let governance: SignerWithAddress
  let arbitrumTMEWC: ArbitrumTMEWC

  before(async () => {
    await deployments.fixture()
    ;({ governance } = await helpers.signers.getNamedSigners())

    arbitrumTMEWC = (await helpers.contracts.getContract(
      "ArbitrumTMEWC"
    )) as ArbitrumTMEWC
  })

  describe("when a new contract is valid", () => {
    let arbitrumTMEWCUpgraded: ArbitrumTMEWCUpgraded

    before(async () => {
      const [upgradedContract] = await helpers.upgrades.upgradeProxy(
        "ArbitrumTMEWC",
        "ArbitrumTMEWCUpgraded",
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
      arbitrumTMEWCUpgraded = upgradedContract as ArbitrumTMEWCUpgraded
    })

    it("new instance should have the same address as the old one", async () => {
      expect(arbitrumTMEWCUpgraded.address).equal(arbitrumTMEWC.address)
    })

    it("should initialize new variable", async () => {
      expect(await arbitrumTMEWCUpgraded.newVar()).to.be.equal(
        "Hello darkness my old friend"
      )
    })

    it("should not update already set name", async () => {
      expect(await arbitrumTMEWCUpgraded.name()).to.be.equal("Arbitrum tMEWC")
    })

    it("should not update already set symbol", async () => {
      expect(await arbitrumTMEWCUpgraded.symbol()).to.be.equal("tMEWC")
    })

    it("should revert when V1's initializer is called", async () => {
      await expect(
        arbitrumTMEWCUpgraded.initialize("ArbitrumTMEWC", "ArbTMEWC")
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })
})
