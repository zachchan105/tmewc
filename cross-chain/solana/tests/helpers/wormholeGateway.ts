import { parseVaa } from "@certusone/wormhole-sdk";
import * as tokenBridge from "@certusone/wormhole-sdk/lib/cjs/solana/tokenBridge";
import * as coreBridge from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { BN, Program, workspace } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { expect } from "chai";
import { WormholeGateway } from "../../target/types/wormhole_gateway";
import {
  CORE_BRIDGE_DATA,
  CORE_BRIDGE_PROGRAM_ID,
  ETHEREUM_ENDPOINT,
  TMEWC_PROGRAM_ID,
  TOKEN_BRIDGE_PROGRAM_ID,
  WORMHOLE_GATEWAY_PROGRAM_ID,
  WRAPPED_TMEWC_ASSET,
  WRAPPED_TMEWC_MINT,
} from "./consts";
import * as tmewc from "./tmewc";
import { getTokenBridgeCoreEmitter, getTokenBridgeSequence } from "./utils";

export function getCustodianPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("redeemer")],
    WORMHOLE_GATEWAY_PROGRAM_ID
  )[0];
}

export function getCoreMessagePDA(sequence: bigint): PublicKey {
  const encodedSequence = Buffer.alloc(8);
  encodedSequence.writeBigUInt64LE(sequence);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("msg"), encodedSequence],
    WORMHOLE_GATEWAY_PROGRAM_ID
  )[0];
}

export function getGatewayInfoPDA(targetChain: number): PublicKey {
  const encodedChain = Buffer.alloc(2);
  encodedChain.writeUInt16LE(targetChain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gateway-info"), encodedChain],
    WORMHOLE_GATEWAY_PROGRAM_ID
  )[0];
}

export function getWrappedTmewcTokenPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("wrapped-token")],
    WORMHOLE_GATEWAY_PROGRAM_ID
  )[0];
}

export function getTokenBridgeSenderPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sender")],
    WORMHOLE_GATEWAY_PROGRAM_ID
  )[0];
}

export function getTokenBridgeRedeemerPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("redeemer")],
    WORMHOLE_GATEWAY_PROGRAM_ID
  )[0];
}

export async function getCustodianData() {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  const custodian = getCustodianPDA();
  return program.account.custodian.fetch(custodian);
}

export async function checkCustodian(expected: {
  authority: PublicKey;
  mintingLimit: bigint;
  pendingAuthority: PublicKey | null;
}) {
  let { authority, mintingLimit, pendingAuthority } = expected;
  const custodianState = await getCustodianData();

  expect(custodianState.mintingLimit.eq(new BN(mintingLimit.toString()))).to.be
    .true;
  expect(custodianState.authority).to.eql(authority);
  expect(custodianState.pendingAuthority).to.eql(pendingAuthority);
}

export async function getMintedAmount(): Promise<bigint> {
  const custodianState = await getCustodianData();
  return BigInt(custodianState.mintedAmount.toString());
}

export async function getGatewayInfo(chain: number) {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  const gatewayInfo = getGatewayInfoPDA(chain);
  return program.account.gatewayInfo.fetch(gatewayInfo);
}

export async function checkGateway(chain: number, expectedAddress: number[]) {
  const gatewayInfoState = await getGatewayInfo(chain);
  expect(gatewayInfoState.address).to.eql(expectedAddress);
}

type CancelAuthorityChange = {
  custodian?: PublicKey;
  authority: PublicKey;
};

export async function cancelAuthorityChangeIx(
  accounts: CancelAuthorityChange
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;

  let { custodian, authority } = accounts;
  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  return program.methods
    .cancelAuthorityChange()
    .accounts({
      custodian,
      authority,
    })
    .instruction();
}

type ChangeAuthorityContext = {
  custodian?: PublicKey;
  authority: PublicKey;
  newAuthority: PublicKey;
};

export async function changeAuthorityIx(
  accounts: ChangeAuthorityContext
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;

  let { custodian, authority, newAuthority } = accounts;
  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  return program.methods
    .changeAuthority()
    .accounts({
      custodian,
      authority,
      newAuthority,
    })
    .instruction();
}

type TakeAuthorityContext = {
  custodian?: PublicKey;
  pendingAuthority: PublicKey;
};

export async function takeAuthorityIx(
  accounts: TakeAuthorityContext
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;

  let { custodian, pendingAuthority } = accounts;
  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  return program.methods
    .takeAuthority()
    .accounts({
      custodian,
      pendingAuthority,
    })
    .instruction();
}

type UpdateMintingLimitContext = {
  custodian?: PublicKey;
  authority: PublicKey;
};

export async function updateMintingLimitIx(
  accounts: UpdateMintingLimitContext,
  amount: bigint
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;

  let { custodian, authority } = accounts;
  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  return program.methods
    .updateMintingLimit(new BN(amount.toString()))
    .accounts({
      custodian,
      authority,
    })
    .instruction();
}

type UpdateGatewayAddressContext = {
  custodian?: PublicKey;
  gatewayInfo?: PublicKey;
  authority: PublicKey;
};

type UpdateGatewayAddressArgs = {
  chain: number;
  address: number[];
};

export async function updateGatewayAddress(
  accounts: UpdateGatewayAddressContext,
  args: UpdateGatewayAddressArgs
) {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  let { custodian, gatewayInfo, authority } = accounts;

  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  if (gatewayInfo === undefined) {
    gatewayInfo = getGatewayInfoPDA(args.chain);
  }

  return program.methods
    .updateGatewayAddress(args)
    .accounts({
      custodian,
      gatewayInfo,
      authority,
    })
    .instruction();
}

type DepositWormholeTmewcContext = {
  custodian?: PublicKey;
  wrappedTmewcToken?: PublicKey;
  wrappedTmewcMint?: PublicKey;
  tmewcMint?: PublicKey;
  recipientWrappedToken: PublicKey;
  recipientToken: PublicKey;
  recipient: PublicKey;
  tmewcConfig?: PublicKey;
  tmewcMinterInfo?: PublicKey;
  tmewcProgram?: PublicKey;
};

export async function depositWormholeTmewcIx(
  accounts: DepositWormholeTmewcContext,
  amount: bigint
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  let {
    custodian,
    wrappedTmewcToken,
    wrappedTmewcMint,
    tmewcMint,
    recipientWrappedToken,
    recipientToken,
    recipient,
    tmewcConfig,
    tmewcMinterInfo,
    tmewcProgram,
  } = accounts;

  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  if (wrappedTmewcToken === undefined) {
    wrappedTmewcToken = getWrappedTmewcTokenPDA();
  }

  if (wrappedTmewcMint === undefined) {
    wrappedTmewcMint = WRAPPED_TMEWC_MINT;
  }

  if (tmewcMint === undefined) {
    tmewcMint = tmewc.getMintPDA();
  }

  if (tmewcConfig === undefined) {
    tmewcConfig = tmewc.getConfigPDA();
  }

  if (tmewcMinterInfo === undefined) {
    tmewcMinterInfo = tmewc.getMinterInfoPDA(custodian);
  }

  if (tmewcProgram === undefined) {
    tmewcProgram = TMEWC_PROGRAM_ID;
  }

  return program.methods
    .depositWormholeTmewc(new BN(amount.toString()))
    .accounts({
      custodian,
      wrappedTmewcToken,
      wrappedTmewcMint,
      tmewcMint,
      recipientWrappedToken,
      recipientToken,
      recipient,
      tmewcConfig,
      tmewcMinterInfo,
      tmewcProgram,
    })
    .instruction();
}

type ReceiveTmewcContext = {
  payer: PublicKey;
  custodian?: PublicKey;
  postedVaa?: PublicKey;
  tokenBridgeClaim?: PublicKey;
  wrappedTmewcToken?: PublicKey;
  wrappedTmewcMint?: PublicKey;
  tmewcMint?: PublicKey;
  recipientToken: PublicKey;
  recipient: PublicKey;
  recipientWrappedToken?: PublicKey;
  tmewcConfig?: PublicKey;
  tmewcMinterInfo?: PublicKey;
  tokenBridgeConfig?: PublicKey;
  tokenBridgeRegisteredEmitter?: PublicKey;
  //tokenBridgeRedeemer?: PublicKey;
  tokenBridgeWrappedAsset?: PublicKey;
  tokenBridgeMintAuthority?: PublicKey;
  rent?: PublicKey;
  tmewcProgram?: PublicKey;
  tokenBridgeProgram?: PublicKey;
  coreBridgeProgram?: PublicKey;
};

export async function receiveTmewcIx(
  accounts: ReceiveTmewcContext,
  signedVaa: Buffer
): Promise<TransactionInstruction> {
  const parsed = parseVaa(signedVaa);

  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  let {
    payer,
    custodian,
    postedVaa,
    tokenBridgeClaim,
    wrappedTmewcToken,
    wrappedTmewcMint,
    tmewcMint,
    recipientToken,
    recipient,
    recipientWrappedToken,
    tmewcConfig,
    tmewcMinterInfo,
    tokenBridgeConfig,
    tokenBridgeRegisteredEmitter,
    //tokenBridgeRedeemer,
    tokenBridgeWrappedAsset,
    tokenBridgeMintAuthority,
    rent,
    tmewcProgram,
    tokenBridgeProgram,
    coreBridgeProgram,
  } = accounts;

  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  if (postedVaa === undefined) {
    postedVaa = coreBridge.derivePostedVaaKey(
      CORE_BRIDGE_PROGRAM_ID,
      parsed.hash
    );
  }

  if (tokenBridgeClaim === undefined) {
    tokenBridgeClaim = coreBridge.deriveClaimKey(
      TOKEN_BRIDGE_PROGRAM_ID,
      parsed.emitterAddress,
      parsed.emitterChain,
      parsed.sequence
    );
  }

  if (wrappedTmewcToken === undefined) {
    wrappedTmewcToken = getWrappedTmewcTokenPDA();
  }

  if (wrappedTmewcMint === undefined) {
    wrappedTmewcMint = WRAPPED_TMEWC_MINT;
  }

  if (tmewcMint === undefined) {
    tmewcMint = tmewc.getMintPDA();
  }

  if (recipientWrappedToken == undefined) {
    recipientWrappedToken = getAssociatedTokenAddressSync(
      wrappedTmewcMint,
      recipient
    );
  }

  if (tmewcConfig === undefined) {
    tmewcConfig = tmewc.getConfigPDA();
  }

  if (tmewcMinterInfo === undefined) {
    tmewcMinterInfo = tmewc.getMinterInfoPDA(custodian);
  }

  if (tokenBridgeConfig === undefined) {
    tokenBridgeConfig = tokenBridge.deriveTokenBridgeConfigKey(
      TOKEN_BRIDGE_PROGRAM_ID
    );
  }

  if (tokenBridgeRegisteredEmitter === undefined) {
    tokenBridgeRegisteredEmitter = ETHEREUM_ENDPOINT;
  }

  // if (tokenBridgeRedeemer === undefined) {
  //   tokenBridgeRedeemer = tokenBridge.deriveRedeemerAccountKey(
  //     WORMHOLE_GATEWAY_PROGRAM_ID
  //   );
  // }

  if (tokenBridgeWrappedAsset === undefined) {
    tokenBridgeWrappedAsset = WRAPPED_TMEWC_ASSET;
  }

  if (tokenBridgeMintAuthority === undefined) {
    tokenBridgeMintAuthority = tokenBridge.deriveMintAuthorityKey(
      TOKEN_BRIDGE_PROGRAM_ID
    );
  }

  if (rent === undefined) {
    rent = SYSVAR_RENT_PUBKEY;
  }

  if (tmewcProgram === undefined) {
    tmewcProgram = TMEWC_PROGRAM_ID;
  }

  if (tokenBridgeProgram === undefined) {
    tokenBridgeProgram = TOKEN_BRIDGE_PROGRAM_ID;
  }

  if (coreBridgeProgram === undefined) {
    coreBridgeProgram = CORE_BRIDGE_PROGRAM_ID;
  }

  return program.methods
    .receiveTmewc(Array.from(parsed.hash))
    .accounts({
      payer,
      custodian,
      postedVaa,
      tokenBridgeClaim,
      wrappedTmewcToken,
      tmewcMint,
      recipientToken,
      recipient,
      recipientWrappedToken,
      tmewcConfig,
      tmewcMinterInfo,
      wrappedTmewcMint,
      tokenBridgeConfig,
      tokenBridgeRegisteredEmitter,
      //tokenBridgeRedeemer,
      tokenBridgeWrappedAsset,
      tokenBridgeMintAuthority,
      rent,
      tmewcProgram,
      tokenBridgeProgram,
      coreBridgeProgram,
    })
    .instruction();
}

type SendTmewcGatewayContext = {
  custodian?: PublicKey;
  gatewayInfo?: PublicKey;
  wrappedTmewcToken?: PublicKey;
  wrappedTmewcMint?: PublicKey;
  tmewcMint?: PublicKey;
  senderToken: PublicKey;
  sender: PublicKey;
  tokenBridgeConfig?: PublicKey;
  tokenBridgeWrappedAsset?: PublicKey;
  tokenBridgeTransferAuthority?: PublicKey;
  coreBridgeData?: PublicKey;
  coreMessage?: PublicKey;
  tokenBridgeCoreEmitter?: PublicKey;
  coreEmitterSequence?: PublicKey;
  coreFeeCollector?: PublicKey;
  clock?: PublicKey;
  tokenBridgeSender?: PublicKey;
  rent?: PublicKey;
  tokenBridgeProgram?: PublicKey;
  coreBridgeProgram?: PublicKey;
};

type SendTmewcGatewayArgs = {
  amount: BN;
  recipientChain: number;
  recipient: number[];
  nonce: number;
};

export async function sendTmewcGatewayIx(
  accounts: SendTmewcGatewayContext,
  args: SendTmewcGatewayArgs
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  let {
    custodian,
    gatewayInfo,
    wrappedTmewcToken,
    wrappedTmewcMint,
    tmewcMint,
    senderToken,
    sender,
    tokenBridgeConfig,
    tokenBridgeWrappedAsset,
    tokenBridgeTransferAuthority,
    coreBridgeData,
    coreMessage,
    tokenBridgeCoreEmitter,
    coreEmitterSequence,
    coreFeeCollector,
    clock,
    tokenBridgeSender,
    rent,
    tokenBridgeProgram,
    coreBridgeProgram,
  } = accounts;

  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  if (gatewayInfo === undefined) {
    gatewayInfo = getGatewayInfoPDA(args.recipientChain);
  }

  if (wrappedTmewcToken === undefined) {
    wrappedTmewcToken = getWrappedTmewcTokenPDA();
  }

  if (wrappedTmewcMint === undefined) {
    wrappedTmewcMint = WRAPPED_TMEWC_MINT;
  }

  if (tmewcMint === undefined) {
    tmewcMint = tmewc.getMintPDA();
  }

  if (tokenBridgeConfig === undefined) {
    tokenBridgeConfig = tokenBridge.deriveTokenBridgeConfigKey(
      TOKEN_BRIDGE_PROGRAM_ID
    );
  }

  if (tokenBridgeWrappedAsset === undefined) {
    tokenBridgeWrappedAsset = WRAPPED_TMEWC_ASSET;
  }

  if (tokenBridgeTransferAuthority === undefined) {
    tokenBridgeTransferAuthority = tokenBridge.deriveAuthoritySignerKey(
      TOKEN_BRIDGE_PROGRAM_ID
    );
  }

  if (coreBridgeData === undefined) {
    coreBridgeData = CORE_BRIDGE_DATA;
  }

  if (coreMessage === undefined) {
    const sequence = await getTokenBridgeSequence();
    coreMessage = getCoreMessagePDA(sequence);
  }

  if (tokenBridgeCoreEmitter === undefined) {
    tokenBridgeCoreEmitter = getTokenBridgeCoreEmitter();
  }

  if (coreEmitterSequence === undefined) {
    coreEmitterSequence = coreBridge.deriveEmitterSequenceKey(
      tokenBridgeCoreEmitter,
      CORE_BRIDGE_PROGRAM_ID
    );
  }

  if (coreFeeCollector === undefined) {
    coreFeeCollector = coreBridge.deriveFeeCollectorKey(CORE_BRIDGE_PROGRAM_ID);
  }

  if (clock === undefined) {
    clock = SYSVAR_CLOCK_PUBKEY;
  }

  if (tokenBridgeSender === undefined) {
    tokenBridgeSender = tokenBridge.deriveSenderAccountKey(
      WORMHOLE_GATEWAY_PROGRAM_ID
    );
  }

  if (rent === undefined) {
    rent = SYSVAR_RENT_PUBKEY;
  }

  if (tokenBridgeProgram === undefined) {
    tokenBridgeProgram = TOKEN_BRIDGE_PROGRAM_ID;
  }

  if (coreBridgeProgram === undefined) {
    coreBridgeProgram = CORE_BRIDGE_PROGRAM_ID;
  }

  return program.methods
    .sendTmewcGateway(args)
    .accounts({
      custodian,
      gatewayInfo,
      wrappedTmewcToken,
      wrappedTmewcMint,
      tmewcMint,
      senderToken,
      sender,
      tokenBridgeConfig,
      tokenBridgeWrappedAsset,
      tokenBridgeTransferAuthority,
      coreBridgeData,
      coreMessage,
      tokenBridgeCoreEmitter,
      coreEmitterSequence,
      coreFeeCollector,
      clock,
      tokenBridgeSender,
      rent,
      tokenBridgeProgram,
      coreBridgeProgram,
    })
    .instruction();
}

type SendTmewcWrappedContext = {
  custodian?: PublicKey;
  wrappedTmewcToken?: PublicKey;
  wrappedTmewcMint?: PublicKey;
  tmewcMint?: PublicKey;
  senderToken: PublicKey;
  sender: PublicKey;
  tokenBridgeConfig?: PublicKey;
  tokenBridgeWrappedAsset?: PublicKey;
  tokenBridgeTransferAuthority?: PublicKey;
  coreBridgeData?: PublicKey;
  coreMessage?: PublicKey;
  tokenBridgeCoreEmitter?: PublicKey;
  coreEmitterSequence?: PublicKey;
  coreFeeCollector?: PublicKey;
  clock?: PublicKey;
  rent?: PublicKey;
  tokenBridgeProgram?: PublicKey;
  coreBridgeProgram?: PublicKey;
};

type SendTmewcWrappedArgs = {
  amount: BN;
  recipientChain: number;
  recipient: number[];
  arbiterFee: BN;
  nonce: number;
};

export async function sendTmewcWrappedIx(
  accounts: SendTmewcWrappedContext,
  args: SendTmewcWrappedArgs
): Promise<TransactionInstruction> {
  const program = workspace.WormholeGateway as Program<WormholeGateway>;
  let {
    custodian,
    wrappedTmewcToken,
    wrappedTmewcMint,
    tmewcMint,
    senderToken,
    sender,
    tokenBridgeConfig,
    tokenBridgeWrappedAsset,
    tokenBridgeTransferAuthority,
    coreBridgeData,
    coreMessage,
    tokenBridgeCoreEmitter,
    coreEmitterSequence,
    coreFeeCollector,
    clock,
    rent,
    tokenBridgeProgram,
    coreBridgeProgram,
  } = accounts;

  if (custodian === undefined) {
    custodian = getCustodianPDA();
  }

  if (wrappedTmewcToken === undefined) {
    wrappedTmewcToken = getWrappedTmewcTokenPDA();
  }

  if (wrappedTmewcMint === undefined) {
    wrappedTmewcMint = WRAPPED_TMEWC_MINT;
  }

  if (tmewcMint === undefined) {
    tmewcMint = tmewc.getMintPDA();
  }

  if (tokenBridgeConfig === undefined) {
    tokenBridgeConfig = tokenBridge.deriveTokenBridgeConfigKey(
      TOKEN_BRIDGE_PROGRAM_ID
    );
  }

  if (tokenBridgeWrappedAsset === undefined) {
    tokenBridgeWrappedAsset = WRAPPED_TMEWC_ASSET;
  }

  if (tokenBridgeTransferAuthority === undefined) {
    tokenBridgeTransferAuthority = tokenBridge.deriveAuthoritySignerKey(
      TOKEN_BRIDGE_PROGRAM_ID
    );
  }

  if (coreBridgeData === undefined) {
    coreBridgeData = CORE_BRIDGE_DATA;
  }

  if (coreMessage === undefined) {
    const sequence = await getTokenBridgeSequence();
    coreMessage = getCoreMessagePDA(sequence);
  }

  if (tokenBridgeCoreEmitter === undefined) {
    tokenBridgeCoreEmitter = getTokenBridgeCoreEmitter();
  }

  if (coreEmitterSequence === undefined) {
    coreEmitterSequence = coreBridge.deriveEmitterSequenceKey(
      tokenBridgeCoreEmitter,
      CORE_BRIDGE_PROGRAM_ID
    );
  }

  if (coreFeeCollector === undefined) {
    coreFeeCollector = coreBridge.deriveFeeCollectorKey(CORE_BRIDGE_PROGRAM_ID);
  }

  if (clock === undefined) {
    clock = SYSVAR_CLOCK_PUBKEY;
  }

  if (rent === undefined) {
    rent = SYSVAR_RENT_PUBKEY;
  }

  if (tokenBridgeProgram === undefined) {
    tokenBridgeProgram = TOKEN_BRIDGE_PROGRAM_ID;
  }

  if (coreBridgeProgram === undefined) {
    coreBridgeProgram = CORE_BRIDGE_PROGRAM_ID;
  }

  return program.methods
    .sendTmewcWrapped(args)
    .accounts({
      custodian,
      wrappedTmewcToken,
      wrappedTmewcMint,
      tmewcMint,
      senderToken,
      sender,
      tokenBridgeConfig,
      tokenBridgeWrappedAsset,
      tokenBridgeTransferAuthority,
      coreBridgeData,
      coreMessage,
      tokenBridgeCoreEmitter,
      coreEmitterSequence,
      coreFeeCollector,
      clock,
      rent,
      tokenBridgeProgram,
      coreBridgeProgram,
    })
    .instruction();
}
