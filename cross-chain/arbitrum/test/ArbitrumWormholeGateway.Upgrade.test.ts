import { ethers, deployments, helpers } from "hardhat"
import { expect } from "chai"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import type {
  ArbitrumTMEWC,
  ArbitrumWormholeGateway,
  ArbitrumWormholeGatewayUpgraded,
} from "../typechain"

const ZERO_ADDRESS = ethers.constants.AddressZero

describe("ArbitrumWormholeGatewayUpgraded - Upgrade", async () => {
  let governance: SignerWithAddress
  let arbitrumWormholeGateway: ArbitrumWormholeGateway

  before(async () => {
    await deployments.fixture()
    ;({ governance } = await helpers.signers.getNamedSigners())

    arbitrumWormholeGateway = (await helpers.contracts.getContract(
      "ArbitrumWormholeGateway"
    )) as ArbitrumWormholeGateway
  })

  describe("when a new contract is valid", () => {
    let arbitrumWormholeGatewayUpgraded: ArbitrumWormholeGatewayUpgraded
    let arbitrumTMEWC: ArbitrumTMEWC

    before(async () => {
      arbitrumTMEWC = (await helpers.contracts.getContract(
        "ArbitrumTMEWC"
      )) as ArbitrumTMEWC

      const [upgradedContract] = await helpers.upgrades.upgradeProxy(
        "ArbitrumWormholeGateway",
        "ArbitrumWormholeGatewayUpgraded",
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
      arbitrumWormholeGatewayUpgraded =
        upgradedContract as ArbitrumWormholeGatewayUpgraded
    })

    it("new instance should have the same address as the old one", async () => {
      expect(arbitrumWormholeGatewayUpgraded.address).equal(
        arbitrumWormholeGateway.address
      )
    })

    it("should initialize new variable", async () => {
      expect(await arbitrumWormholeGatewayUpgraded.newVar()).to.be.equal(
        "Hello darkness my old friend"
      )
    })

    it("should not update already set variable", async () => {
      expect(await arbitrumWormholeGatewayUpgraded.tmewc()).to.be.equal(
        arbitrumTMEWC.address
      )
    })

    it("should revert when V1's initializer is called", async () => {
      await expect(
        arbitrumWormholeGatewayUpgraded.initialize(
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          ZERO_ADDRESS
        )
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })
})
