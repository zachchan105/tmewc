# Namespace: BitcoinNetwork

## Table of contents

### Functions

- [fromGenesisHash](BitcoinNetwork.md#fromgenesishash)

## Functions

### fromGenesisHash

▸ **fromGenesisHash**(`hash`): [`BitcoinNetwork`](../enums/BitcoinNetwork-1.md)

Gets Meowcoin Network type by comparing a provided hash to known
[genesis block hashes](https://en.meowcoin.it/wiki/Genesis_block).
Returns [BitcoinNetwork.Unknown](../enums/BitcoinNetwork-1.md#unknown)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `hash` | [`Hex`](../classes/Hex.md) | Hash of a block. |

#### Returns

[`BitcoinNetwork`](../enums/BitcoinNetwork-1.md)

Meowcoin Network.

#### Defined in

[src/lib/meowcoin/network.ts:33](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/meowcoin/network.ts#L33)
