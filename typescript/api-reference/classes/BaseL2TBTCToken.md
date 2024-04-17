# Class: BaseL2TMEWCToken

Implementation of the Base L2TMEWCToken handle.

**`See`**

for reference.

## Hierarchy

- `EthersContractHandle`\<`L2TMEWCTypechain`\>

  ↳ **`BaseL2TMEWCToken`**

## Implements

- [`L2TMEWCToken`](../interfaces/L2TMEWCToken.md)

## Table of contents

### Constructors

- [constructor](BaseL2TMEWCToken.md#constructor)

### Properties

- [\_deployedAtBlockNumber](BaseL2TMEWCToken.md#_deployedatblocknumber)
- [\_instance](BaseL2TMEWCToken.md#_instance)
- [\_totalRetryAttempts](BaseL2TMEWCToken.md#_totalretryattempts)

### Methods

- [balanceOf](BaseL2TMEWCToken.md#balanceof)
- [getAddress](BaseL2TMEWCToken.md#getaddress)
- [getChainIdentifier](BaseL2TMEWCToken.md#getchainidentifier)
- [getEvents](BaseL2TMEWCToken.md#getevents)

## Constructors

### constructor

• **new BaseL2TMEWCToken**(`config`, `chainId`): [`BaseL2TMEWCToken`](BaseL2TMEWCToken.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`EthereumContractConfig`](../interfaces/EthereumContractConfig.md) |
| `chainId` | [`Base`](../enums/Chains.Base.md) |

#### Returns

[`BaseL2TMEWCToken`](BaseL2TMEWCToken.md)

#### Overrides

EthersContractHandle\&lt;L2TMEWCTypechain\&gt;.constructor

#### Defined in

[src/lib/base/l2-tmewc-token.ts:23](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-tmewc-token.ts#L23)

## Properties

### \_deployedAtBlockNumber

• `Protected` `Readonly` **\_deployedAtBlockNumber**: `number`

Number of a block within which the contract was deployed. Value is read from
the contract deployment artifact. It can be overwritten by setting a
[EthersContractConfig.deployedAtBlockNumber](../interfaces/EthereumContractConfig.md#deployedatblocknumber) property.

#### Inherited from

EthersContractHandle.\_deployedAtBlockNumber

#### Defined in

[src/lib/ethereum/adapter.ts:80](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L80)

___

### \_instance

• `Protected` `Readonly` **\_instance**: `L2TMEWC`

Ethers instance of the deployed contract.

#### Inherited from

EthersContractHandle.\_instance

#### Defined in

[src/lib/ethereum/adapter.ts:74](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L74)

___

### \_totalRetryAttempts

• `Protected` `Readonly` **\_totalRetryAttempts**: `number`

Number of retries for ethereum requests.

#### Inherited from

EthersContractHandle.\_totalRetryAttempts

#### Defined in

[src/lib/ethereum/adapter.ts:84](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L84)

## Methods

### balanceOf

▸ **balanceOf**(`identifier`): `Promise`\<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `identifier` | [`ChainIdentifier`](../interfaces/ChainIdentifier.md) |

#### Returns

`Promise`\<`BigNumber`\>

**`See`**

#### Implementation of

[L2TMEWCToken](../interfaces/L2TMEWCToken.md).[balanceOf](../interfaces/L2TMEWCToken.md#balanceof)

#### Defined in

[src/lib/base/l2-tmewc-token.ts:53](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-tmewc-token.ts#L53)

___

### getAddress

▸ **getAddress**(): [`EthereumAddress`](EthereumAddress.md)

Get address of the contract instance.

#### Returns

[`EthereumAddress`](EthereumAddress.md)

Address of this contract instance.

#### Inherited from

EthersContractHandle.getAddress

#### Defined in

[src/lib/ethereum/adapter.ts:112](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L112)

___

### getChainIdentifier

▸ **getChainIdentifier**(): [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

#### Returns

[`ChainIdentifier`](../interfaces/ChainIdentifier.md)

**`See`**

#### Implementation of

[L2TMEWCToken](../interfaces/L2TMEWCToken.md).[getChainIdentifier](../interfaces/L2TMEWCToken.md#getchainidentifier)

#### Defined in

[src/lib/base/l2-tmewc-token.ts:45](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-tmewc-token.ts#L45)

___

### getEvents

▸ **getEvents**(`eventName`, `options?`, `...filterArgs`): `Promise`\<`Event`[]\>

Get events emitted by the Ethereum contract.
It starts searching from provided block number. If the GetEvents.Options#fromBlock
option is missing it looks for a contract's defined property
[_deployedAtBlockNumber](BaseL2BitcoinDepositor.md#_deployedatblocknumber). If the property is missing starts searching
from block `0`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Name of the event. |
| `options?` | [`Options`](../interfaces/GetChainEvents.Options.md) | Options for events fetching. |
| `...filterArgs` | `unknown`[] | Arguments for events filtering. |

#### Returns

`Promise`\<`Event`[]\>

Array of found events.

#### Inherited from

EthersContractHandle.getEvents

#### Defined in

[src/lib/ethereum/adapter.ts:127](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L127)
