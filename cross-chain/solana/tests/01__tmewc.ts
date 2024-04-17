import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { assert, expect } from "chai";
import { Tmewc } from "../target/types/tmewc";
import * as tmewc from "./helpers/tmewc";
import {
  expectIxFail,
  expectIxSuccess,
  getOrCreateAta,
  getTokenBalance,
  sleep,
  transferLamports,
} from "./helpers/utils";

describe("tmewc", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Tmewc as Program<Tmewc>;

  const authority = (
    (program.provider as anchor.AnchorProvider).wallet as anchor.Wallet
  ).payer;
  const newAuthority = anchor.web3.Keypair.generate();
  const minter = anchor.web3.Keypair.generate();
  const anotherMinter = anchor.web3.Keypair.generate();
  const imposter = anchor.web3.Keypair.generate();
  const guardian = anchor.web3.Keypair.generate();
  const anotherGuardian = anchor.web3.Keypair.generate();

  const recipient = anchor.web3.Keypair.generate();
  const txPayer = anchor.web3.Keypair.generate();

  it("set up payers", async () => {
    await transferLamports(authority, newAuthority.publicKey, 10000000000);
    await transferLamports(authority, imposter.publicKey, 10000000000);
    await transferLamports(authority, recipient.publicKey, 10000000000);
    await transferLamports(authority, txPayer.publicKey, 10000000000);
  });

  it("initialize", async () => {
    const ix = await tmewc.initializeIx({ authority: authority.publicKey });
    await expectIxSuccess([ix], [authority]);
    await tmewc.checkConfig({
      authority: authority.publicKey,
      numMinters: 0,
      numGuardians: 0,
      supply: BigInt(0),
      paused: false,
      pendingAuthority: null,
    });
  });

  describe("authority changes", () => {
    it("cannot cancel authority if no pending", async () => {
      const failedCancelIx = await tmewc.cancelAuthorityChangeIx({
        authority: authority.publicKey,
      });
      await expectIxFail(
        [failedCancelIx],
        [authority],
        "NoPendingAuthorityChange"
      );
    });

    it("cannot take authority if no pending", async () => {
      const failedTakeIx = await tmewc.takeAuthorityIx({
        pendingAuthority: newAuthority.publicKey,
      });
      await expectIxFail(
        [failedTakeIx],
        [newAuthority],
        "NoPendingAuthorityChange"
      );
    });

    it("change authority to new authority", async () => {
      const changeIx = await tmewc.changeAuthorityIx({
        authority: authority.publicKey,
        newAuthority: newAuthority.publicKey,
      });
      await expectIxSuccess([changeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 0,
        numGuardians: 0,
        supply: BigInt(0),
        paused: false,
        pendingAuthority: newAuthority.publicKey,
      });
    });

    it("take as new authority", async () => {
      // Bug in validator? Need to wait a bit for new blockhash.
      await sleep(10000);

      const takeIx = await tmewc.takeAuthorityIx({
        pendingAuthority: newAuthority.publicKey,
      });
      await expectIxSuccess([takeIx], [newAuthority]);
      await tmewc.checkConfig({
        authority: newAuthority.publicKey,
        numMinters: 0,
        numGuardians: 0,
        supply: BigInt(0),
        paused: false,
        pendingAuthority: null,
      });
    });

    it("change pending authority back to original authority", async () => {
      const changeBackIx = await tmewc.changeAuthorityIx({
        authority: newAuthority.publicKey,
        newAuthority: authority.publicKey,
      });
      await expectIxSuccess([changeBackIx], [newAuthority]);
      await tmewc.checkConfig({
        authority: newAuthority.publicKey,
        numMinters: 0,
        numGuardians: 0,
        supply: BigInt(0),
        paused: false,
        pendingAuthority: authority.publicKey,
      });
    });

    it("cannot take as signers that are not pending authority", async () => {
      const failedImposterTakeIx = await tmewc.takeAuthorityIx({
        pendingAuthority: imposter.publicKey,
      });
      await expectIxFail(
        [failedImposterTakeIx],
        [imposter],
        "IsNotPendingAuthority"
      );

      const failedNewAuthorityTakeIx = await tmewc.takeAuthorityIx({
        pendingAuthority: newAuthority.publicKey,
      });
      await expectIxFail(
        [failedNewAuthorityTakeIx],
        [newAuthority],
        "IsNotPendingAuthority"
      );
    });

    it("cannot cancel as someone else", async () => {
      const anotherFailedCancelIx = await tmewc.cancelAuthorityChangeIx({
        authority: authority.publicKey,
      });
      await expectIxFail(
        [anotherFailedCancelIx],
        [authority],
        "IsNotAuthority"
      );
    });

    it("finally take as authority", async () => {
      const anotherTakeIx = await tmewc.takeAuthorityIx({
        pendingAuthority: authority.publicKey,
      });
      await expectIxSuccess([anotherTakeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 0,
        numGuardians: 0,
        supply: BigInt(0),
        paused: false,
        pendingAuthority: null,
      });
    });
  });

  describe("minting", () => {
    it("cannot add minter without authority", async () => {
      const cannotAddMinterIx = await tmewc.addMinterIx({
        authority: imposter.publicKey,
        minter: minter.publicKey,
      });
      await expectIxFail([cannotAddMinterIx], [imposter], "IsNotAuthority");
    });

    it("add minter", async () => {
      const mustBeNull = await tmewc
        .checkMinterInfo(minter.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "minter info found");

      const addMinterIx = await tmewc.addMinterIx({
        authority: authority.publicKey,
        minter: minter.publicKey,
      });
      await expectIxSuccess([addMinterIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 0,
        supply: BigInt(0),
        paused: false,
        pendingAuthority: null,
      });
      await tmewc.checkMinterInfo(minter.publicKey);
    });

    it("mint", async () => {
      const amount = BigInt(1000);

      const recipientToken = await getOrCreateAta(
        authority,
        tmewc.getMintPDA(),
        recipient.publicKey
      );
      const recipientBefore = await getTokenBalance(recipientToken);
      expect(recipientBefore).to.equal(BigInt(0));

      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(amount.toString())
      );
      await expectIxSuccess([mintIx], [txPayer, minter]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 0,
        supply: BigInt(1000),
        paused: false,
        pendingAuthority: null,
      });

      const recipientAfter = await getTokenBalance(recipientToken);
      expect(recipientAfter).to.equal(amount);
    });

    it("cannot mint without minter", async () => {
      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );

      const cannotMintIx = await tmewc.mintIx(
        {
          minter: imposter.publicKey,
          recipientToken,
        },
        new anchor.BN(420)
      );
      await expectIxFail(
        [cannotMintIx],
        [txPayer, imposter],
        "AccountNotInitialized"
      );

      // Now try with actual minter's info account.
      const minterInfo = tmewc.getMinterInfoPDA(minter.publicKey);

      const cannotMintAgainIx = await tmewc.mintIx(
        {
          minterInfo,
          minter: imposter.publicKey,
          recipientToken,
        },
        new anchor.BN(420)
      );
      await expectIxFail(
        [cannotMintAgainIx],
        [txPayer, imposter],
        "ConstraintSeeds"
      );
    });

    it("add another minter", async () => {
      const mustBeNull = await tmewc
        .checkMinterInfo(anotherMinter.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "minter info found");

      const addMinterIx = await tmewc.addMinterIx({
        authority: authority.publicKey,
        minter: anotherMinter.publicKey,
      });
      await expectIxSuccess([addMinterIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 2,
        numGuardians: 0,
        supply: BigInt(1000),
        paused: false,
        pendingAuthority: null,
      });
      await tmewc.checkMinterInfo(anotherMinter.publicKey);
    });

    it("cannot remove minter with wrong key", async () => {
      const minterInfo = tmewc.getMinterInfoPDA(minter.publicKey);
      const cannotRemoveIx = await tmewc.removeMinterIx({
        authority: authority.publicKey,
        minterInfo,
        minter: anotherMinter.publicKey,
      });
      await expectIxFail([cannotRemoveIx], [authority], "ConstraintSeeds");
    });

    it("mint with another minter", async () => {
      const amount = BigInt(500);

      const recipientToken = await spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );
      const recipientBefore = await getTokenBalance(recipientToken);
      expect(recipientBefore).to.equal(BigInt(1000));

      const mintIx = await tmewc.mintIx(
        {
          minter: anotherMinter.publicKey,
          recipientToken,
        },
        new anchor.BN(amount.toString())
      );
      await expectIxSuccess([mintIx], [txPayer, anotherMinter]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 2,
        numGuardians: 0,
        supply: BigInt(1500),
        paused: false,
        pendingAuthority: null,
      });

      const recipientAfter = await getTokenBalance(recipientToken);
      expect(recipientAfter).to.equal(recipientBefore + amount);
    });

    it("cannot remove minter without authority", async () => {
      const cannotRemoveIx = await tmewc.removeMinterIx({
        authority: imposter.publicKey,
        minter: anotherMinter.publicKey,
      });
      await expectIxFail([cannotRemoveIx], [imposter], "IsNotAuthority");
    });

    it("remove minter", async () => {
      const removeIx = await tmewc.removeMinterIx({
        authority: authority.publicKey,
        minter: anotherMinter.publicKey,
      });
      await expectIxSuccess([removeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 0,
        supply: BigInt(1500),
        paused: false,
        pendingAuthority: null,
      });
      const mustBeNull = await tmewc
        .checkMinterInfo(anotherMinter.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "minter info found");
    });

    it("cannot remove same minter again", async () => {
      const cannotRemoveIx = await tmewc.removeMinterIx({
        authority: authority.publicKey,
        minter: anotherMinter.publicKey,
      });
      await expectIxFail(
        [cannotRemoveIx],
        [authority],
        "AccountNotInitialized"
      );
    });

    it("remove last minter", async () => {
      const removeIx = await tmewc.removeMinterIx({
        authority: authority.publicKey,
        minter: minter.publicKey,
      });
      await expectIxSuccess([removeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 0,
        numGuardians: 0,
        supply: BigInt(1500),
        paused: false,
        pendingAuthority: null,
      });
      const mustBeNull = await tmewc
        .checkMinterInfo(minter.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "minter info found");
    });
  });

  describe("guardians", () => {
    it("cannot add guardian without authority", async () => {
      const cannotAddIx = await tmewc.addGuardianIx({
        authority: imposter.publicKey,
        guardian: guardian.publicKey,
      });
      await expectIxFail([cannotAddIx], [imposter], "IsNotAuthority");
    });

    it("add guardian", async () => {
      const mustBeNull = await tmewc
        .checkGuardianInfo(guardian.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "guardian info found");

      const addIx = await tmewc.addGuardianIx({
        authority: authority.publicKey,
        guardian: guardian.publicKey,
      });
      await expectIxSuccess([addIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 0,
        numGuardians: 1,
        supply: BigInt(1500),
        paused: false,
        pendingAuthority: null,
      });
      await tmewc.checkGuardianInfo(guardian.publicKey);
    });

    it("cannot pause without guardian", async () => {
      const cannotPauseIx = await tmewc.pauseIx({
        guardian: imposter.publicKey,
      });
      await expectIxFail(
        [cannotPauseIx],
        [txPayer, imposter],
        "AccountNotInitialized"
      );

      // Now try with actual guardian's info account.
      const guardianInfo = tmewc.getGuardianInfoPDA(guardian.publicKey);

      const cannotPauseAgainIx = await tmewc.pauseIx({
        guardianInfo,
        guardian: imposter.publicKey,
      });
      await expectIxFail(
        [cannotPauseAgainIx],
        [txPayer, imposter],
        "ConstraintSeeds"
      );
    });

    it("add minter and mint", async () => {
      const addMinterIx = await tmewc.addMinterIx({
        authority: authority.publicKey,
        minter: minter.publicKey,
      });
      await expectIxSuccess([addMinterIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 1,
        supply: BigInt(1500),
        paused: false,
        pendingAuthority: null,
      });

      const amount = BigInt(100);

      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );
      const recipientBefore = await getTokenBalance(recipientToken);
      expect(recipientBefore).to.equal(BigInt(1500));

      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(amount.toString())
      );
      await expectIxSuccess([mintIx], [txPayer, minter]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 1,
        supply: BigInt(1600),
        paused: false,
        pendingAuthority: null,
      });

      const recipientAfter = await getTokenBalance(recipientToken);
      expect(recipientAfter).to.equal(recipientBefore + amount);
    });

    it("pause", async () => {
      const pauseIx = await tmewc.pauseIx({
        guardian: guardian.publicKey,
      });
      await expectIxSuccess([pauseIx], [txPayer, guardian]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 1,
        supply: BigInt(1600),
        paused: true,
        pendingAuthority: null,
      });
    });

    it("cannot mint while paused", async () => {
      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );

      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(100)
      );
      await expectIxFail([mintIx], [txPayer, minter], "IsPaused");
    });

    it("add another guardian", async () => {
      const mustBeNull = await tmewc
        .checkGuardianInfo(anotherGuardian.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "guardian info found");

      const addIx = await tmewc.addGuardianIx({
        authority: authority.publicKey,
        guardian: anotherGuardian.publicKey,
      });
      await expectIxSuccess([addIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 2,
        supply: BigInt(1600),
        paused: true,
        pendingAuthority: null,
      });
      await tmewc.checkGuardianInfo(anotherGuardian.publicKey);
    });

    it("cannot pause again", async () => {
      const cannotPauseIx = await tmewc.pauseIx({
        guardian: anotherGuardian.publicKey,
      });
      await expectIxFail(
        [cannotPauseIx],
        [txPayer, anotherGuardian],
        "IsPaused"
      );
    });

    it("unpause", async () => {
      const unpauseIx = await tmewc.unpauseIx({
        authority: authority.publicKey,
      });
      await expectIxSuccess([unpauseIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 2,
        supply: BigInt(1600),
        paused: false,
        pendingAuthority: null,
      });
    });

    it("cannot unpause again", async () => {
      const cannotUnpauseIx = await tmewc.unpauseIx({
        authority: authority.publicKey,
      });
      await expectIxFail(
        [cannotUnpauseIx],
        [txPayer, authority],
        "IsNotPaused"
      );
    });

    it("mint while unpaused", async () => {
      const amount = BigInt(200);

      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );
      const recipientBefore = await getTokenBalance(recipientToken);
      expect(recipientBefore).to.equal(BigInt(1600));

      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(amount.toString())
      );
      await expectIxSuccess([mintIx], [txPayer, minter]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 2,
        supply: BigInt(1800),
        paused: false,
        pendingAuthority: null,
      });

      const recipientAfter = await getTokenBalance(recipientToken);
      expect(recipientAfter).to.equal(recipientBefore + amount);
    });

    it("pause as another guardian", async () => {
      const pauseIx = await tmewc.pauseIx({
        guardian: anotherGuardian.publicKey,
      });
      await expectIxSuccess([pauseIx], [txPayer, anotherGuardian]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 2,
        supply: BigInt(1800),
        paused: true,
        pendingAuthority: null,
      });
    });

    it("cannot mint again while paused", async () => {
      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );

      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(100)
      );
      await expectIxFail([mintIx], [txPayer, minter], "IsPaused");
    });

    it("cannot remove guardian without authority", async () => {
      const cannotRemoveIx = await tmewc.removeGuardianIx({
        authority: imposter.publicKey,
        guardian: anotherGuardian.publicKey,
      });
      await expectIxFail([cannotRemoveIx], [imposter], "IsNotAuthority");
    });

    it("cannot remove guardian with mismatched info", async () => {
      const guardianInfo = tmewc.getGuardianInfoPDA(anotherGuardian.publicKey);
      const cannotRemoveIx = await tmewc.removeGuardianIx({
        authority: authority.publicKey,
        guardianInfo,
        guardian: guardian.publicKey,
      });
      await expectIxFail([cannotRemoveIx], [authority], "ConstraintSeeds");
    });

    it("remove guardian", async () => {
      const removeIx = await tmewc.removeGuardianIx({
        authority: authority.publicKey,
        guardian: anotherGuardian.publicKey,
      });
      await expectIxSuccess([removeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 1,
        supply: BigInt(1800),
        paused: true,
        pendingAuthority: null,
      });
      const mustBeNull = await tmewc
        .checkGuardianInfo(anotherGuardian.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "guardian info found");
    });

    it("unpause", async () => {
      const unpauseIx = await tmewc.unpauseIx({
        authority: authority.publicKey,
      });
      await expectIxSuccess([unpauseIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 1,
        supply: BigInt(1800),
        paused: false,
        pendingAuthority: null,
      });
    });

    it("cannot pause with removed guardian", async () => {
      const pauseIx = await tmewc.pauseIx({
        guardian: anotherGuardian.publicKey,
      });
      await expectIxFail(
        [pauseIx],
        [txPayer, anotherGuardian],
        "AccountNotInitialized"
      );
    });

    it("pause and remove last guardian", async () => {
      const pauseIx = await tmewc.pauseIx({
        guardian: guardian.publicKey,
      });
      await expectIxSuccess([pauseIx], [txPayer, guardian]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 1,
        supply: BigInt(1800),
        paused: true,
        pendingAuthority: null,
      });

      const removeIx = await tmewc.removeGuardianIx({
        authority: authority.publicKey,
        guardian: guardian.publicKey,
      });
      await expectIxSuccess([removeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 0,
        supply: BigInt(1800),
        paused: true,
        pendingAuthority: null,
      });
      const mustBeNull = await tmewc
        .checkGuardianInfo(guardian.publicKey)
        .catch((_) => null);
      assert(mustBeNull === null, "guardian info found");
    });

    it("cannot mint yet again", async () => {
      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );

      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(100)
      );
      await expectIxFail([mintIx], [txPayer, minter], "IsPaused");
    });

    it("unpause without any guardians then mint", async () => {
      const unpauseIx = await tmewc.unpauseIx({
        authority: authority.publicKey,
      });
      await expectIxSuccess([unpauseIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 0,
        supply: BigInt(1800),
        paused: false,
        pendingAuthority: null,
      });

      const recipientToken = spl.getAssociatedTokenAddressSync(
        tmewc.getMintPDA(),
        recipient.publicKey
      );

      const amount = BigInt(200);

      const recipientBefore = await getTokenBalance(recipientToken);
      const mintIx = await tmewc.mintIx(
        {
          minter: minter.publicKey,
          recipientToken,
        },
        new anchor.BN(amount.toString())
      );
      await expectIxSuccess([mintIx], [txPayer, minter]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 1,
        numGuardians: 0,
        supply: BigInt(2000),
        paused: false,
        pendingAuthority: null,
      });

      const recipientAfter = await getTokenBalance(recipientToken);
      expect(recipientAfter).to.equal(recipientBefore + amount);
    });

    it("remove minter", async () => {
      const removeIx = await tmewc.removeMinterIx({
        authority: authority.publicKey,
        minter: minter.publicKey,
      });
      await expectIxSuccess([removeIx], [authority]);
      await tmewc.checkConfig({
        authority: authority.publicKey,
        numMinters: 0,
        numGuardians: 0,
        supply: BigInt(2000),
        paused: false,
        pendingAuthority: null,
      });
    });
  });
});
