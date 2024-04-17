# Interface: BitcoinTxOutput

Data about a Meowcoin transaction output.

## Table of contents

### Properties

- [outputIndex](BitcoinTxOutput.md#outputindex)
- [scriptPubKey](BitcoinTxOutput.md#scriptpubkey)
- [value](BitcoinTxOutput.md#value)

## Properties

### outputIndex

• **outputIndex**: `number`

The 0-based index of the output.

#### Defined in

[src/lib/meowcoin/tx.ts:77](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L77)

___

### scriptPubKey

• **scriptPubKey**: [`Hex`](../classes/Hex.md)

The receiving scriptPubKey.

#### Defined in

[src/lib/meowcoin/tx.ts:87](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L87)

___

### value

• **value**: `BigNumber`

The value of the output in satoshis.

#### Defined in

[src/lib/meowcoin/tx.ts:82](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/tx.ts#L82)
