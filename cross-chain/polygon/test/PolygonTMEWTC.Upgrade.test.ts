import { deployments, helpers } from "hardhat"
import { expect } from "chai"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import type { PolygonTMEWC, PolygonTMEWCUpgraded } from "../typechain"

describe("PolygonTMEWC - Upgrade", async () => {
  let governance: SignerWithAddress
  let polygonTMEWC: PolygonTMEWC

  before(async () => {
    await deployments.fixture()
    ;({ governance } = await helpers.signers.getNamedSigners())

    polygonTMEWC = (await helpers.contracts.getContract(
      "PolygonTMEWC"
    )) as PolygonTMEWC
  })

  describe("when a new contract is valid", () => {
    let polygonTMEWCUpgraded: PolygonTMEWCUpgraded

    before(async () => {
      const [upgradedContract] = await helpers.upgrades.upgradeProxy(
        "PolygonTMEWC",
        "PolygonTMEWCUpgraded",
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
      polygonTMEWCUpgraded = upgradedContract as PolygonTMEWCUpgraded
    })

    it("new instance should have the same address as the old one", async () => {
      expect(polygonTMEWCUpgraded.address).equal(polygonTMEWC.address)
    })

    it("should initialize new variable", async () => {
      expect(await polygonTMEWCUpgraded.newVar()).to.be.equal(
        "Hello darkness my old friend"
      )
    })

    it("should not update already set name", async () => {
      expect(await polygonTMEWCUpgraded.name()).to.be.equal("Polygon tMEWC")
    })

    it("should not update already set symbol", async () => {
      expect(await polygonTMEWCUpgraded.symbol()).to.be.equal("tMEWC")
    })

    it("should revert when V1's initializer is called", async () => {
      await expect(
        polygonTMEWCUpgraded.initialize("PolygonTMEWC", "PolTMEWC")
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })
})
