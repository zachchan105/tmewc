import * as anchor from "@coral-xyz/anchor"
import fs from "fs"
import { PublicKey, Keypair } from "@solana/web3.js"
import dotenv from "dotenv"
import { Program } from "@coral-xyz/anchor"
import { Tmewc } from "../target/types/tmewc"
import { WormholeGateway } from "../target/types/wormhole_gateway"
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata"
import * as consts from "./helpers/consts"

async function run(): Promise<void> {
  dotenv.config({ path: "../solana.env" })

  anchor.setProvider(anchor.AnchorProvider.env())

  const tmewcProgram = anchor.workspace.Tmewc as Program<Tmewc>
  const wormholeGatewayProgram = anchor.workspace
    .WormholeGateway as Program<WormholeGateway>

  // This wallet deployed the program and is also an authority
  const authority = loadKey(process.env.AUTHORITY).publicKey

  const mint = PublicKey.findProgramAddressSync(
    [Buffer.from("tmewc-mint")],
    tmewcProgram.programId
  )[0]

  const config = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    tmewcProgram.programId
  )[0]

  const guardians = PublicKey.findProgramAddressSync(
    [Buffer.from("guardians")],
    tmewcProgram.programId
  )[0]

  const minters = PublicKey.findProgramAddressSync(
    [Buffer.from("minters")],
    tmewcProgram.programId
  )[0]

  const tmewcMetadata = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  )[0]

  const mplTokenMetadataProgram = METADATA_PROGRAM_ID

  // Initalize tmewc program
  await tmewcProgram.methods
    .initialize()
    .accounts({
      mint,
      config,
      guardians,
      minters,
      authority,
      tmewcMetadata,
      mplTokenMetadataProgram,
    })
    .rpc()

  const minter = PublicKey.findProgramAddressSync(
    [Buffer.from("redeemer")],
    wormholeGatewayProgram.programId
  )[0]

  const mintingLimit = "18446744073709551615" // Max u64
  let WRAPPED_TMEWC = consts.WRAPPED_TMEWC_MINT_TESTNET
  if (process.env.CLUSTER === "mainnet") {
    WRAPPED_TMEWC = consts.WRAPPED_TMEWC_MINT_MAINNET
  }
  const WRAPPED_TMEWC_MINT = new PublicKey(WRAPPED_TMEWC)

  const gatewayWrappedTmewcToken = PublicKey.findProgramAddressSync(
    [Buffer.from("wrapped-token")],
    wormholeGatewayProgram.programId
  )[0]

  const tokenBridgeSender = PublicKey.findProgramAddressSync(
    [Buffer.from("sender")],
    wormholeGatewayProgram.programId
  )[0]

  // NOTE: It might happen on mainnet that tmewc won't be initialized if running this
  // script in one shot.
  // The simplest solution is just to wait a bit and then proceed with wormhole_gateway
  // initializtion.

  // Initialize wormhole gateway
  await wormholeGatewayProgram.methods
    .initialize(new anchor.BN(mintingLimit))
    .accounts({
      authority,
      custodian: minter,
      tmewcMint: mint,
      wrappedTmewcMint: WRAPPED_TMEWC_MINT,
      wrappedTmewcToken: gatewayWrappedTmewcToken,
      tokenBridgeSender,
    })
    .rpc()

  console.log("Initialized wormhole gateway program..")

  const minterInfo = PublicKey.findProgramAddressSync(
    [Buffer.from("minter-info"), minter.toBuffer()],
    tmewcProgram.programId
  )[0]

  // Adding a minter (wormholeGateway)
  await tmewcProgram.methods
    .addMinter()
    .accounts({
      config,
      authority,
      minters,
      minterInfo,
      minter,
    })
    .rpc()

  console.log("Added a minter..")

  // Point to devnet addresses by default
  let ARBITRUM_GATEWAY = consts.ARBITRUM_GATEWAY_ADDRESS_TESTNET
  let OPTIMISM_GATEWAY = consts.OPTIMISM_GATEWAY_ADDRESS_TESTNET
  let POLYGON_GATEWAY = consts.POLYGON_GATEWAY_ADDRESS_TESTNET
  let BASE_GATEWAY = consts.BASE_GATEWAY_ADDRESS_TESTNET
  let SOLANA_GATEWAY = consts.SOLANA_GATEWAY_ADDRESS_TESTNET
  if (process.env.CLUSTER === "mainnet") {
    ARBITRUM_GATEWAY = consts.ARBITRUM_GATEWAY_ADDRESS_MAINNET
    OPTIMISM_GATEWAY = consts.OPTIMISM_GATEWAY_ADDRESS_MAINNET
    POLYGON_GATEWAY = consts.POLYGON_GATEWAY_ADDRESS_MAINNET
    BASE_GATEWAY = consts.BASE_GATEWAY_ADDRESS_MAINNET
    SOLANA_GATEWAY = consts.SOLANA_GATEWAY_ADDRESS_MAINNET
  }

  // Updating with Arbitrum
  const arbiArgs = {
    chain: consts.WH_ARBITRUM_CHAIN_ID,
    address: Array.from(Buffer.alloc(32, ARBITRUM_GATEWAY, "hex")),
  }

  const encodedArbiChain = Buffer.alloc(2)
  encodedArbiChain.writeUInt16LE(consts.WH_ARBITRUM_CHAIN_ID)
  const gatewayArbiInfo = PublicKey.findProgramAddressSync(
    [Buffer.from("gateway-info"), encodedArbiChain],
    wormholeGatewayProgram.programId
  )[0]

  await wormholeGatewayProgram.methods
    .updateGatewayAddress(arbiArgs)
    .accounts({
      custodian: minter,
      gatewayInfo: gatewayArbiInfo,
      authority,
    })
    .rpc()

  console.log(
    "Updated Solana gateway with Arbitrum..",
    Array.from(new PublicKey(ARBITRUM_GATEWAY).toBuffer())
  )

  // Updating with Optimism
  const optiArgs = {
    chain: consts.WH_OPTIMISM_CHAIN_ID,
    address: Array.from(Buffer.alloc(32, OPTIMISM_GATEWAY, "hex")),
  }

  const encodedOptiChain = Buffer.alloc(2)
  encodedOptiChain.writeUInt16LE(consts.WH_OPTIMISM_CHAIN_ID)
  const gatewayOptiInfo = PublicKey.findProgramAddressSync(
    [Buffer.from("gateway-info"), encodedOptiChain],
    wormholeGatewayProgram.programId
  )[0]

  await wormholeGatewayProgram.methods
    .updateGatewayAddress(optiArgs)
    .accounts({
      custodian: minter,
      gatewayInfo: gatewayOptiInfo,
      authority,
    })
    .rpc()

  console.log(
    "Updated Solana gateway with Optimism..",
    Array.from(new PublicKey(OPTIMISM_GATEWAY).toBuffer())
  )

  // Updating with Polygon
  const polyArgs = {
    chain: consts.WH_POLYGON_CHAIN_ID,
    address: Array.from(Buffer.alloc(32, POLYGON_GATEWAY, "hex")),
  }

  const encodedPolyChain = Buffer.alloc(2)
  encodedPolyChain.writeUInt16LE(consts.WH_POLYGON_CHAIN_ID)
  const gatewayPolyInfo = PublicKey.findProgramAddressSync(
    [Buffer.from("gateway-info"), encodedPolyChain],
    wormholeGatewayProgram.programId
  )[0]

  await wormholeGatewayProgram.methods
    .updateGatewayAddress(polyArgs)
    .accounts({
      custodian: minter,
      gatewayInfo: gatewayPolyInfo,
      authority,
    })
    .rpc()

  console.log(
    "Updated Solana gateway with Polygon..",
    Array.from(new PublicKey(POLYGON_GATEWAY).toBuffer())
  )

  // Updating with BASE
  const baseArgs = {
    chain: consts.WH_BASE_CHAIN_ID,
    address: Array.from(Buffer.alloc(32, BASE_GATEWAY, "hex")),
  }

  const encodedBaseChain = Buffer.alloc(2)
  encodedBaseChain.writeUInt16LE(consts.WH_BASE_CHAIN_ID)
  const gatewayBaseInfo = PublicKey.findProgramAddressSync(
    [Buffer.from("gateway-info"), encodedBaseChain],
    wormholeGatewayProgram.programId
  )[0]

  await wormholeGatewayProgram.methods
    .updateGatewayAddress(baseArgs)
    .accounts({
      custodian: minter,
      gatewayInfo: gatewayBaseInfo,
      authority,
    })
    .rpc()

  console.log(
    "Updated Solana gateway with Base..",
    Array.from(Buffer.alloc(32, BASE_GATEWAY, "hex"))
  )

  // Updating with self (SOLANA)
  const solanaArgs = {
    chain: consts.WH_SOLANA_CHAIN_ID,
    address: Array.from(new PublicKey(SOLANA_GATEWAY).toBuffer()),
  }

  const encodedSolanaChain = Buffer.alloc(2)
  encodedSolanaChain.writeUInt16LE(consts.WH_SOLANA_CHAIN_ID)
  const gatewaySolanaInfo = PublicKey.findProgramAddressSync(
    [Buffer.from("gateway-info"), encodedSolanaChain],
    wormholeGatewayProgram.programId
  )[0]

  await wormholeGatewayProgram.methods
    .updateGatewayAddress(solanaArgs)
    .accounts({
      custodian: minter,
      gatewayInfo: gatewaySolanaInfo,
      authority,
    })
    .rpc()

  console.log(
    "Updated Solana gateway with self (Solana)..",
    Array.from(new PublicKey(SOLANA_GATEWAY).toBuffer())
  )

  console.log("Done initializing programs!")
}

;(async () => {
  try {
    await run()
  } catch (e) {
    console.log("Exception called:", e)
  }
})()

function loadKey(filename: string): Keypair {
  try {
    const contents = fs.readFileSync(filename).toString()
    const bs = Uint8Array.from(JSON.parse(contents))

    return Keypair.fromSecretKey(bs)
  } catch {
    console.log("Unable to read keypair...", filename)
  }
}
