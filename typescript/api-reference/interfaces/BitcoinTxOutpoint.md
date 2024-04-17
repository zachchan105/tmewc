# Interface: BitcoinTxOutpoint

Data about a Meowcoin transaction outpoint.

## Table of contents

### Properties

- [outputIndex](BitcoinTxOutpoint.md#outputindex)
- [transactionHash](BitcoinTxOutpoint.md#transactionhash)

## Properties

### outputIndex

• **outputIndex**: `number`

The zero-based index of the output from the specified transaction.

#### Defined in

[src/lib/meowcoin/tx.ts:57](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L57)

___

### transactionHash

• **transactionHash**: [`BitcoinTxHash`](../classes/BitcoinTxHash.md)

The hash of the transaction the outpoint belongs to.

#### Defined in

[src/lib/meowcoin/tx.ts:52](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L52)
