# Interface: BitcoinRawTxVectors

Represents a raw Meowcoin transaction decomposed into specific vectors.

## Table of contents

### Properties

- [inputs](BitcoinRawTxVectors.md#inputs)
- [locktime](BitcoinRawTxVectors.md#locktime)
- [outputs](BitcoinRawTxVectors.md#outputs)
- [version](BitcoinRawTxVectors.md#version)

## Properties

### inputs

• **inputs**: [`Hex`](../classes/Hex.md)

All transaction's inputs prepended by the number of transaction inputs,
as a hex string.

#### Defined in

[src/lib/meowcoin/tx.ts:113](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L113)

___

### locktime

• **locktime**: [`Hex`](../classes/Hex.md)

Transaction locktime as a hex string.

#### Defined in

[src/lib/meowcoin/tx.ts:124](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L124)

___

### outputs

• **outputs**: [`Hex`](../classes/Hex.md)

All transaction's outputs prepended by the number of transaction outputs,
as a hex string.

#### Defined in

[src/lib/meowcoin/tx.ts:119](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L119)

___

### version

• **version**: [`Hex`](../classes/Hex.md)

Transaction version as a hex string.

#### Defined in

[src/lib/meowcoin/tx.ts:107](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L107)
