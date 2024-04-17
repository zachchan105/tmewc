import { WormholeGateway } from "./../target/types/wormhole_gateway"
import * as anchor from "@coral-xyz/anchor"
import fs from "fs"
import { PublicKey, Keypair } from "@solana/web3.js"
import dotenv from "dotenv"

async function run(): Promise<void> {
  dotenv.config({ path: "solana.env" })

  anchor.setProvider(anchor.AnchorProvider.env())

  const authority = loadKey(process.env.AUTHORITY)
  const newAuthority = process.env.THRESHOLD_COUNCIL_MULTISIG

  const tmewcProgram = anchor.workspace.Tmewc
  const wormholeGatewayProgram = anchor.workspace.WormholeGateway

  const config = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    tmewcProgram.programId
  )[0]

  const custodian = PublicKey.findProgramAddressSync(
    [Buffer.from("redeemer")],
    wormholeGatewayProgram.programId
  )[0]

  await tmewcProgram.methods
    .changeAuthority()
    .accounts({
      config,
      authority,
      newAuthority,
    })
    .rpc()

  await wormholeGatewayProgram.methods
    .changeAuthority()
    .accounts({
      custodian,
      authority,
      newAuthority,
    })
    .rpc()
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
