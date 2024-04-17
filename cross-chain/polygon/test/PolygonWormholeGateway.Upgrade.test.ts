import { ethers, deployments, helpers } from "hardhat"
import { expect } from "chai"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import type {
  PolygonTMEWC,
  PolygonWormholeGateway,
  PolygonWormholeGatewayUpgraded,
} from "../typechain"

const ZERO_ADDRESS = ethers.constants.AddressZero

describe("PolygonWormholeGatewayUpgraded - Upgrade", async () => {
  let governance: SignerWithAddress
  let polygonWormholeGateway: PolygonWormholeGateway

  before(async () => {
    await deployments.fixture()
    ;({ governance } = await helpers.signers.getNamedSigners())

    polygonWormholeGateway = (await helpers.contracts.getContract(
      "PolygonWormholeGateway"
    )) as PolygonWormholeGateway
  })

  describe("when a new contract is valid", () => {
    let polygonWormholeGatewayUpgraded: PolygonWormholeGatewayUpgraded
    let PolygonTMEWC: PolygonTMEWC

    before(async () => {
      PolygonTMEWC = (await helpers.contracts.getContract(
        "PolygonTMEWC"
      )) as PolygonTMEWC

      const [upgradedContract] = await helpers.upgrades.upgradeProxy(
        "PolygonWormholeGateway",
        "PolygonWormholeGatewayUpgraded",
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
      polygonWormholeGatewayUpgraded =
        upgradedContract as PolygonWormholeGatewayUpgraded
    })

    it("new instance should have the same address as the old one", async () => {
      expect(polygonWormholeGatewayUpgraded.address).equal(
        polygonWormholeGateway.address
      )
    })

    it("should initialize new variable", async () => {
      expect(await polygonWormholeGatewayUpgraded.newVar()).to.be.equal(
        "Hello darkness my old friend"
      )
    })

    it("should not update already set variable", async () => {
      expect(await polygonWormholeGatewayUpgraded.tmewc()).to.be.equal(
        PolygonTMEWC.address
      )
    })

    it("should revert when V1's initializer is called", async () => {
      await expect(
        polygonWormholeGatewayUpgraded.initialize(
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          ZERO_ADDRESS
        )
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })
})
