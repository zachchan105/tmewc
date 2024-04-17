# Interface: L2TMEWCToken

Interface for communication with the on-chain contract of the given
canonical L2 tMEWC token.

## Implemented by

- [`BaseL2TMEWCToken`](../classes/BaseL2TMEWCToken.md)

## Table of contents

### Methods

- [balanceOf](L2TMEWCToken.md#balanceof)
- [getChainIdentifier](L2TMEWCToken.md#getchainidentifier)

## Methods

### balanceOf

▸ **balanceOf**(`identifier`): `Promise`\<`BigNumber`\>

Returns the balance of the given identifier.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `identifier` | [`ChainIdentifier`](ChainIdentifier.md) | Identifier of the account to get the balance for. |

#### Returns

`Promise`\<`BigNumber`\>

The balance of the given identifier in 1e18 precision.

#### Defined in

[src/lib/contracts/cross-chain.ts:61](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/contracts/cross-chain.ts#L61)

___

### getChainIdentifier

▸ **getChainIdentifier**(): [`ChainIdentifier`](ChainIdentifier.md)

Gets the chain-specific identifier of this contract.

#### Returns

[`ChainIdentifier`](ChainIdentifier.md)

#### Defined in

[src/lib/contracts/cross-chain.ts:54](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/contracts/cross-chain.ts#L54)
