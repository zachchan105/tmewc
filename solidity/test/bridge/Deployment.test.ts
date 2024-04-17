/* eslint-disable @typescript-eslint/no-unused-expressions */
import { deployments, ethers, helpers, upgrades } from "hardhat"
import chai, { expect } from "chai"
import chaiAsPromised from "chai-as-promised"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import type {
  ProxyAdmin,
  Bridge,
  BridgeGovernance,
  Bank,
  TMEWCVault,
  TMEWC,
  MaintainerProxy,
  ReimbursementPool,
  WalletRegistry,
  VendingMachine,
} from "../../typechain"
import type { TransparentUpgradeableProxy } from "../../typechain/TransparentUpgradeableProxy"

chai.use(chaiAsPromised)

const { AddressZero } = ethers.constants

describe("Deployment", async () => {
  let deployer: SignerWithAddress
  let governance: SignerWithAddress
  let esdm: SignerWithAddress
  let keepTechnicalWalletTeam: SignerWithAddress
  let keepCommunityMultiSig: SignerWithAddress

  let bridge: Bridge
  let bridgeGovernance: BridgeGovernance
  let bridgeProxy: TransparentUpgradeableProxy
  let proxyAdmin: ProxyAdmin
  let bank: Bank
  let tmewcVault: TMEWCVault
  let tmewc: TMEWC
  let maintainerProxy: MaintainerProxy
  let reimbursementPool: ReimbursementPool
  let walletRegistry: WalletRegistry
  let vendingMachine: VendingMachine

  let bridgeImplementationAddress: string

  before(async () => {
    await deployments.fixture()
    ;({
      deployer,
      governance,
      esdm,
      keepTechnicalWalletTeam,
      keepCommunityMultiSig,
    } = await helpers.signers.getNamedSigners())
    bridgeGovernance = await helpers.contracts.getContract("BridgeGovernance")

    bridge = await helpers.contracts.getContract("Bridge")

    bridgeImplementationAddress = (await deployments.get("Bridge"))
      .implementation

    bridgeProxy = await ethers.getContractAt(
      "TransparentUpgradeableProxy",
      bridge.address
    )

    proxyAdmin = (await upgrades.admin.getInstance()) as ProxyAdmin

    bank = await helpers.contracts.getContract("Bank")
    tmewcVault = await helpers.contracts.getContract("TMEWCVault")
    tmewc = await helpers.contracts.getContract("TMEWC")
    maintainerProxy = await helpers.contracts.getContract("MaintainerProxy")
    reimbursementPool = await helpers.contracts.getContract("ReimbursementPool")
    walletRegistry = await helpers.contracts.getContract("WalletRegistry")
    vendingMachine = await helpers.contracts.getContract("VendingMachine")

    expect(deployer.address).to.be.not.equal(
      governance.address,
      "deployer is the same as governance"
    )
  })

  describe("Bridge", () => {
    it("should set Bridge proxy admin", async () => {
      // To let a non-proxy-admin read the admin we have to read it directly from
      // the storage slot, see: https://docs.openzeppelin.com/contracts/4.x/api/proxy#TransparentUpgradeableProxy-admin--
      expect(
        ethers.utils.defaultAbiCoder.decode(
          ["address"],
          await ethers.provider.getStorageAt(
            bridge.address,
            "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
          )
        )[0]
      ).to.be.equal(
        proxyAdmin.address,
        "invalid Bridge proxy admin (read from storage slot)"
      )

      expect(
        await bridgeProxy.connect(proxyAdmin.address).callStatic.admin()
      ).to.be.equal(proxyAdmin.address, "invalid Bridge proxy admin")
    })

    it("should set ProxyAdmin owner", async () => {
      expect(await proxyAdmin.owner()).to.be.equal(
        esdm.address,
        "invalid ProxyAdmin owner"
      )
    })

    it("should set Bridge implementation", async () => {
      // To let a non-proxy-admin read the implementation we have to read it directly from
      // the storage slot, see: https://docs.openzeppelin.com/contracts/4.x/api/proxy#TransparentUpgradeableProxy-implementation--
      expect(
        ethers.utils.defaultAbiCoder.decode(
          ["address"],
          await ethers.provider.getStorageAt(
            bridge.address,
            "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
          )
        )[0],
        "invalid Bridge implementation (read from storage slot)"
      ).to.be.equal(bridgeImplementationAddress)

      expect(
        await bridgeProxy
          .connect(proxyAdmin.address)
          .callStatic.implementation(),
        "invalid Bridge implementation"
      ).to.be.equal(bridgeImplementationAddress)
    })

    it("should set Bridge implementation in ProxyAdmin", async () => {
      expect(
        await proxyAdmin.getProxyImplementation(bridgeProxy.address),
        "invalid proxy implementation"
      ).to.be.equal(bridgeImplementationAddress)
    })

    it("should set implementation address different than proxy address", async () => {
      expect(
        await bridgeProxy
          .connect(proxyAdmin.address)
          .callStatic.implementation(),
        "invalid implementation"
      ).to.be.not.equal(bridge.address)
    })

    it("should set Bridge governance", async () => {
      expect(await bridge.governance()).to.be.equal(
        bridgeGovernance.address,
        "invalid Bridge governance"
      )
    })

    it("should revert when initialize called again", async () => {
      await expect(
        bridge.initialize(
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          0
        )
      ).to.be.revertedWith("Initializable: contract is already initialized")
    })
  })

  describe("BridgeGovernance", () => {
    it("should set owner", async () => {
      expect(
        await bridgeGovernance.owner(),
        "invalid BridgeGovernance owner"
      ).equal(governance.address)
    })
  })

  describe("WalletRegistry", () => {
    it("should set walletOwner", async () => {
      expect(
        await walletRegistry.walletOwner(),
        "invalid walletOwner in WalletRegistry"
      ).equal(bridge.address)
    })
  })

  describe("Bank", () => {
    it("should set Bridge reference", async () => {
      expect(await bank.bridge(), "invalid Bridge address").equal(
        bridge.address
      )
    })

    it("should set Bank owner", async () => {
      expect(await bank.owner(), "invalid Bank owner").equal(governance.address)
    })
  })

  describe("TMEWCVault", () => {
    it("should set Bank reference", async () => {
      expect(await tmewcVault.bank(), "invalid Bank address").equal(bank.address)
    })

    it("should set TMEWC reference", async () => {
      expect(await tmewcVault.tmewcToken(), "invalid TMEWC address").equal(
        tmewc.address
      )
    })

    it("should set TMEWCVault owner", async () => {
      expect(await tmewcVault.owner(), "invalid TMEWCVault owner").equal(
        governance.address
      )
    })
  })

  describe("MaintainerProxy", () => {
    it("should set Bridge reference", async () => {
      expect(await maintainerProxy.bridge(), "invalid Bridge address").equal(
        bridge.address
      )
    })

    it("should set ReimbursementPool reference", async () => {
      expect(
        await maintainerProxy.reimbursementPool(),
        "invalid ReimbursementPool address"
      ).equal(reimbursementPool.address)
    })

    it("should set MaintainerProxy owner", async () => {
      expect(
        await maintainerProxy.owner(),
        "invalid MaintainerProxy owner"
      ).equal(governance.address)
    })
  })

  describe("ReimbursementPool", () => {
    it("should authorize MaintainerProxy in ReimbursementPool", async () => {
      expect(
        await reimbursementPool.isAuthorized(maintainerProxy.address),
        "unauthorized MaintainerProxy"
      ).to.be.true
    })

    it("should set ReimbursementPool owner", async () => {
      expect(
        await reimbursementPool.owner(),
        "invalid ReimbursementPool owner"
      ).equal(governance.address)
    })
  })

  describe("VendingMachine", () => {
    it("should set vendingMachineUpgradeInitiator", async () => {
      expect(
        await vendingMachine.vendingMachineUpgradeInitiator(),
        "invalid vendingMachineUpgradeInitiator"
      ).equal(keepTechnicalWalletTeam.address)
    })

    it("should set unmintFeeUpdateInitiator", async () => {
      expect(
        await vendingMachine.unmintFeeUpdateInitiator(),
        "invalid unmintFeeUpdateInitiator"
      ).equal(keepTechnicalWalletTeam.address)
    })

    it("should set VendingMachine owner", async () => {
      expect(
        await vendingMachine.owner(),
        "invalid VendingMachine owner"
      ).equal(keepCommunityMultiSig.address)
    })
  })
})
