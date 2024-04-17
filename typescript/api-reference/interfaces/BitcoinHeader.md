# Interface: BitcoinHeader

BitcoinHeader represents the header of a Meowcoin block. For reference, see:
https://developer.meowcoin.org/reference/block_chain.html#block-headers.

## Table of contents

### Properties

- [bits](BitcoinHeader.md#bits)
- [merkleRootHash](BitcoinHeader.md#merkleroothash)
- [nonce](BitcoinHeader.md#nonce)
- [previousBlockHeaderHash](BitcoinHeader.md#previousblockheaderhash)
- [time](BitcoinHeader.md#time)
- [version](BitcoinHeader.md#version)

## Properties

### bits

• **bits**: `number`

Bits that determine the target threshold this block's header hash must be
less than or equal to. The field is 4-byte long.

#### Defined in

[src/lib/meowcoin/header.ts:37](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/header.ts#L37)

___

### merkleRootHash

• **merkleRootHash**: [`Hex`](../classes/Hex.md)

The hash derived from the hashes of all transactions included in this block.
The field is 32-byte long.

#### Defined in

[src/lib/meowcoin/header.ts:25](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/header.ts#L25)

___

### nonce

• **nonce**: `number`

An arbitrary number miners change to modify the header hash in order to
produce a hash less than or equal to the target threshold. The field is
4-byte long.

#### Defined in

[src/lib/meowcoin/header.ts:44](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/header.ts#L44)

___

### previousBlockHeaderHash

• **previousBlockHeaderHash**: [`Hex`](../classes/Hex.md)

The hash of the previous block's header. The field is 32-byte long.

#### Defined in

[src/lib/meowcoin/header.ts:19](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/header.ts#L19)

___

### time

• **time**: `number`

The Unix epoch time when the miner started hashing the header. The field is
4-byte long.

#### Defined in

[src/lib/meowcoin/header.ts:31](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/header.ts#L31)

___

### version

• **version**: `number`

The block version number that indicates which set of block validation rules
to follow. The field is 4-byte long.

#### Defined in

[src/lib/meowcoin/header.ts:14](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/header.ts#L14)
