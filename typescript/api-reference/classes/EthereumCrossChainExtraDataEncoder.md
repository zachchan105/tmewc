# Class: EthereumCrossChainExtraDataEncoder

Implementation of the Ethereum CrossChainExtraDataEncoder.

**`See`**

for reference.

## Implements

- [`CrossChainExtraDataEncoder`](../interfaces/CrossChainExtraDataEncoder.md)

## Table of contents

### Constructors

- [constructor](EthereumCrossChainExtraDataEncoder.md#constructor)

### Methods

- [decodeDepositOwner](EthereumCrossChainExtraDataEncoder.md#decodedepositowner)
- [encodeDepositOwner](EthereumCrossChainExtraDataEncoder.md#encodedepositowner)

## Constructors

### constructor

• **new EthereumCrossChainExtraDataEncoder**(): [`EthereumCrossChainExtraDataEncoder`](EthereumCrossChainExtraDataEncoder.md)

#### Returns

[`EthereumCrossChainExtraDataEncoder`](EthereumCrossChainExtraDataEncoder.md)

## Methods

### decodeDepositOwner

▸ **decodeDepositOwner**(`extraData`): [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `extraData` | [`Hex`](Hex.md) |

#### Returns

[`ChainIdentifier`](../interfaces/ChainIdentifier.md)

**`See`**

#### Implementation of

[CrossChainExtraDataEncoder](../interfaces/CrossChainExtraDataEncoder.md).[decodeDepositOwner](../interfaces/CrossChainExtraDataEncoder.md#decodedepositowner)

#### Defined in

[src/lib/ethereum/l1-meowcoin-depositor.ts:154](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/l1-meowcoin-depositor.ts#L154)

___

### encodeDepositOwner

▸ **encodeDepositOwner**(`depositOwner`): [`Hex`](Hex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositOwner` | [`ChainIdentifier`](../interfaces/ChainIdentifier.md) |

#### Returns

[`Hex`](Hex.md)

**`See`**

#### Implementation of

[CrossChainExtraDataEncoder](../interfaces/CrossChainExtraDataEncoder.md).[encodeDepositOwner](../interfaces/CrossChainExtraDataEncoder.md#encodedepositowner)

#### Defined in

[src/lib/ethereum/l1-meowcoin-depositor.ts:140](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/l1-meowcoin-depositor.ts#L140)
