# Class: BaseL2BitcoinDepositor

Implementation of the Base L2BitcoinDepositor handle.

**`See`**

for reference.

## Hierarchy

- `EthersContractHandle`\<`L2BitcoinDepositorTypechain`\>

  ↳ **`BaseL2BitcoinDepositor`**

## Implements

- [`L2BitcoinDepositor`](../interfaces/L2BitcoinDepositor.md)

## Table of contents

### Constructors

- [constructor](BaseL2BitcoinDepositor.md#constructor)

### Properties

- [#depositOwner](BaseL2BitcoinDepositor.md##depositowner)
- [#extraDataEncoder](BaseL2BitcoinDepositor.md##extradataencoder)
- [\_deployedAtBlockNumber](BaseL2BitcoinDepositor.md#_deployedatblocknumber)
- [\_instance](BaseL2BitcoinDepositor.md#_instance)
- [\_totalRetryAttempts](BaseL2BitcoinDepositor.md#_totalretryattempts)

### Methods

- [extraDataEncoder](BaseL2BitcoinDepositor.md#extradataencoder)
- [getAddress](BaseL2BitcoinDepositor.md#getaddress)
- [getChainIdentifier](BaseL2BitcoinDepositor.md#getchainidentifier)
- [getDepositOwner](BaseL2BitcoinDepositor.md#getdepositowner)
- [getEvents](BaseL2BitcoinDepositor.md#getevents)
- [initializeDeposit](BaseL2BitcoinDepositor.md#initializedeposit)
- [setDepositOwner](BaseL2BitcoinDepositor.md#setdepositowner)

## Constructors

### constructor

• **new BaseL2BitcoinDepositor**(`config`, `chainId`): [`BaseL2BitcoinDepositor`](BaseL2BitcoinDepositor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`EthereumContractConfig`](../interfaces/EthereumContractConfig.md) |
| `chainId` | [`Base`](../enums/Chains.Base.md) |

#### Returns

[`BaseL2BitcoinDepositor`](BaseL2BitcoinDepositor.md)

#### Overrides

EthersContractHandle\&lt;L2BitcoinDepositorTypechain\&gt;.constructor

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:37](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L37)

## Properties

### #depositOwner

• `Private` **#depositOwner**: `undefined` \| [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:35](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L35)

___

### #extraDataEncoder

• `Private` `Readonly` **#extraDataEncoder**: [`CrossChainExtraDataEncoder`](../interfaces/CrossChainExtraDataEncoder.md)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:34](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L34)

___

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

• `Protected` `Readonly` **\_instance**: `L2BitcoinDepositor`

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

### extraDataEncoder

▸ **extraDataEncoder**(): [`CrossChainExtraDataEncoder`](../interfaces/CrossChainExtraDataEncoder.md)

#### Returns

[`CrossChainExtraDataEncoder`](../interfaces/CrossChainExtraDataEncoder.md)

**`See`**

#### Implementation of

[L2BitcoinDepositor](../interfaces/L2BitcoinDepositor.md).[extraDataEncoder](../interfaces/L2BitcoinDepositor.md#extradataencoder)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:85](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L85)

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

[L2BitcoinDepositor](../interfaces/L2BitcoinDepositor.md).[getChainIdentifier](../interfaces/L2BitcoinDepositor.md#getchainidentifier)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:61](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L61)

___

### getDepositOwner

▸ **getDepositOwner**(): `undefined` \| [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

#### Returns

`undefined` \| [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

**`See`**

#### Implementation of

[L2BitcoinDepositor](../interfaces/L2BitcoinDepositor.md).[getDepositOwner](../interfaces/L2BitcoinDepositor.md#getdepositowner)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:69](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L69)

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

___

### initializeDeposit

▸ **initializeDeposit**(`depositTx`, `depositOutputIndex`, `deposit`, `vault?`): `Promise`\<[`Hex`](Hex.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositTx` | [`BitcoinRawTxVectors`](../interfaces/BitcoinRawTxVectors.md) |
| `depositOutputIndex` | `number` |
| `deposit` | [`DepositReceipt`](../interfaces/DepositReceipt.md) |
| `vault?` | [`ChainIdentifier`](../interfaces/ChainIdentifier.md) |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

**`See`**

#### Implementation of

[L2BitcoinDepositor](../interfaces/L2BitcoinDepositor.md).[initializeDeposit](../interfaces/L2BitcoinDepositor.md#initializedeposit)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:93](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L93)

___

### setDepositOwner

▸ **setDepositOwner**(`depositOwner`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositOwner` | `undefined` \| [`ChainIdentifier`](../interfaces/ChainIdentifier.md) |

#### Returns

`void`

**`See`**

#### Implementation of

[L2BitcoinDepositor](../interfaces/L2BitcoinDepositor.md).[setDepositOwner](../interfaces/L2BitcoinDepositor.md#setdepositowner)

#### Defined in

[src/lib/base/l2-meowcoin-depositor.ts:77](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/base/l2-meowcoin-depositor.ts#L77)