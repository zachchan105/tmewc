import { BigNumber } from "@ethersproject/bignumber"
import { ethers } from "hardhat"

// TODO: It is deprecated and `to1ePrecision` from the
// https://github.com/zachchan105/hardhat-helpers/blob/main/src/number.ts should
// be used instead.
export function to1ePrecision(n: number, precision: number): BigNumber {
  const decimalMultiplier = ethers.BigNumber.from(10).pow(precision)
  return ethers.BigNumber.from(n).mul(decimalMultiplier)
}

export function to1e18(n: number): BigNumber {
  const decimalMultiplier = ethers.BigNumber.from(10).pow(18)
  return ethers.BigNumber.from(n).mul(decimalMultiplier)
}

export function toSatoshis(amountInBtc: number): BigNumber {
  return to1ePrecision(amountInBtc, 8)
}

export async function getBlockTime(blockNumber: number): Promise<number> {
  return (await ethers.provider.getBlock(blockNumber)).timestamp
}

export function strip0xPrefix(hexString: string): string {
  return hexString.substring(0, 2) === "0x" ? hexString.substring(2) : hexString
}

export function concatenateHexStrings(strs: Array<string>): string {
  let current = "0x"
  for (let i = 0; i < strs.length; i += 1) {
    current = `${current}${strip0xPrefix(strs[i])}`
  }
  return current
}
