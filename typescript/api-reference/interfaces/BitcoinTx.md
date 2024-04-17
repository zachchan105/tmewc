# Interface: BitcoinTx

Data about a Meowcoin transaction.

## Table of contents

### Properties

- [inputs](BitcoinTx.md#inputs)
- [outputs](BitcoinTx.md#outputs)
- [transactionHash](BitcoinTx.md#transactionhash)

## Properties

### inputs

• **inputs**: [`BitcoinTxInput`](../README.md#bitcointxinput)[]

The vector of transaction inputs.

#### Defined in

[src/lib/meowcoin/tx.ts:37](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L37)

___

### outputs

• **outputs**: [`BitcoinTxOutput`](BitcoinTxOutput.md)[]

The vector of transaction outputs.

#### Defined in

[src/lib/meowcoin/tx.ts:42](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L42)

___

### transactionHash

• **transactionHash**: [`BitcoinTxHash`](../classes/BitcoinTxHash.md)

The transaction hash (or transaction ID) as an un-prefixed hex string.

#### Defined in

[src/lib/meowcoin/tx.ts:32](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L32)
