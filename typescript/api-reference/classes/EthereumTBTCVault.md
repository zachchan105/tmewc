# Class: EthereumTMEWCVault

Implementation of the Ethereum TMEWCVault handle.

**`See`**

for reference.

## Hierarchy

- `EthersContractHandle`\<`TMEWCVaultTypechain`\>

  ↳ **`EthereumTMEWCVault`**

## Implements

- [`TMEWCVault`](../interfaces/TMEWCVault.md)

## Table of contents

### Constructors

- [constructor](EthereumTMEWCVault.md#constructor)

### Properties

- [\_deployedAtBlockNumber](EthereumTMEWCVault.md#_deployedatblocknumber)
- [\_instance](EthereumTMEWCVault.md#_instance)
- [\_totalRetryAttempts](EthereumTMEWCVault.md#_totalretryattempts)

### Methods

- [cancelOptimisticMint](EthereumTMEWCVault.md#canceloptimisticmint)
- [finalizeOptimisticMint](EthereumTMEWCVault.md#finalizeoptimisticmint)
- [getAddress](EthereumTMEWCVault.md#getaddress)
- [getChainIdentifier](EthereumTMEWCVault.md#getchainidentifier)
- [getEvents](EthereumTMEWCVault.md#getevents)
- [getMinters](EthereumTMEWCVault.md#getminters)
- [getOptimisticMintingCancelledEvents](EthereumTMEWCVault.md#getoptimisticmintingcancelledevents)
- [getOptimisticMintingFinalizedEvents](EthereumTMEWCVault.md#getoptimisticmintingfinalizedevents)
- [getOptimisticMintingRequestedEvents](EthereumTMEWCVault.md#getoptimisticmintingrequestedevents)
- [isGuardian](EthereumTMEWCVault.md#isguardian)
- [isMinter](EthereumTMEWCVault.md#isminter)
- [optimisticMintingDelay](EthereumTMEWCVault.md#optimisticmintingdelay)
- [optimisticMintingRequests](EthereumTMEWCVault.md#optimisticmintingrequests)
- [parseOptimisticMintingRequest](EthereumTMEWCVault.md#parseoptimisticmintingrequest)
- [requestOptimisticMint](EthereumTMEWCVault.md#requestoptimisticmint)

## Constructors

### constructor

• **new EthereumTMEWCVault**(`config`, `chainId?`): [`EthereumTMEWCVault`](EthereumTMEWCVault.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `config` | [`EthereumContractConfig`](../interfaces/EthereumContractConfig.md) | `undefined` |
| `chainId` | [`Ethereum`](../enums/Chains.Ethereum.md) | `Chains.Ethereum.Local` |

#### Returns

[`EthereumTMEWCVault`](EthereumTMEWCVault.md)

#### Overrides

EthersContractHandle\&lt;TMEWCVaultTypechain\&gt;.constructor

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:41](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L41)

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

• `Protected` `Readonly` **\_instance**: `TMEWCVault`

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

### cancelOptimisticMint

▸ **cancelOptimisticMint**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`Hex`](Hex.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) |
| `depositOutputIndex` | `number` |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[cancelOptimisticMint](../interfaces/TMEWCVault.md#canceloptimisticmint)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:150](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L150)

___

### finalizeOptimisticMint

▸ **finalizeOptimisticMint**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`Hex`](Hex.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) |
| `depositOutputIndex` | `number` |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[finalizeOptimisticMint](../interfaces/TMEWCVault.md#finalizeoptimisticmint)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:173](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L173)

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

[TMEWCVault](../interfaces/TMEWCVault.md).[getChainIdentifier](../interfaces/TMEWCVault.md#getchainidentifier)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:68](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L68)

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

### getMinters

▸ **getMinters**(): `Promise`\<[`EthereumAddress`](EthereumAddress.md)[]\>

#### Returns

`Promise`\<[`EthereumAddress`](EthereumAddress.md)[]\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[getMinters](../interfaces/TMEWCVault.md#getminters)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:90](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L90)

___

### getOptimisticMintingCancelledEvents

▸ **getOptimisticMintingCancelledEvents**(`options?`, `...filterArgs`): `Promise`\<[`OptimisticMintingCancelledEvent`](../README.md#optimisticmintingcancelledevent)[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`Options`](../interfaces/GetChainEvents.Options.md) |
| `...filterArgs` | `any`[] |

#### Returns

`Promise`\<[`OptimisticMintingCancelledEvent`](../README.md#optimisticmintingcancelledevent)[]\>

**`See`**

#### Implementation of

TMEWCVault.getOptimisticMintingCancelledEvents

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:268](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L268)

___

### getOptimisticMintingFinalizedEvents

▸ **getOptimisticMintingFinalizedEvents**(`options?`, `...filterArgs`): `Promise`\<[`OptimisticMintingFinalizedEvent`](../README.md#optimisticmintingfinalizedevent)[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`Options`](../interfaces/GetChainEvents.Options.md) |
| `...filterArgs` | `any`[] |

#### Returns

`Promise`\<[`OptimisticMintingFinalizedEvent`](../README.md#optimisticmintingfinalizedevent)[]\>

**`See`**

#### Implementation of

TMEWCVault.getOptimisticMintingFinalizedEvents

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:295](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L295)

___

### getOptimisticMintingRequestedEvents

▸ **getOptimisticMintingRequestedEvents**(`options?`, `...filterArgs`): `Promise`\<[`OptimisticMintingRequestedEvent`](../README.md#optimisticmintingrequestedevent)[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`Options`](../interfaces/GetChainEvents.Options.md) |
| `...filterArgs` | `any`[] |

#### Returns

`Promise`\<[`OptimisticMintingRequestedEvent`](../README.md#optimisticmintingrequestedevent)[]\>

**`See`**

#### Implementation of

TMEWCVault.getOptimisticMintingRequestedEvents

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:235](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L235)

___

### isGuardian

▸ **isGuardian**(`address`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | [`EthereumAddress`](EthereumAddress.md) |

#### Returns

`Promise`\<`boolean`\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[isGuardian](../interfaces/TMEWCVault.md#isguardian)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:114](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L114)

___

### isMinter

▸ **isMinter**(`address`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | [`EthereumAddress`](EthereumAddress.md) |

#### Returns

`Promise`\<`boolean`\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[isMinter](../interfaces/TMEWCVault.md#isminter)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:104](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L104)

___

### optimisticMintingDelay

▸ **optimisticMintingDelay**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[optimisticMintingDelay](../interfaces/TMEWCVault.md#optimisticmintingdelay)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:76](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L76)

___

### optimisticMintingRequests

▸ **optimisticMintingRequests**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`OptimisticMintingRequest`](../README.md#optimisticmintingrequest)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) |
| `depositOutputIndex` | `number` |

#### Returns

`Promise`\<[`OptimisticMintingRequest`](../README.md#optimisticmintingrequest)\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[optimisticMintingRequests](../interfaces/TMEWCVault.md#optimisticmintingrequests)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:199](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L199)

___

### parseOptimisticMintingRequest

▸ **parseOptimisticMintingRequest**(`request`): [`OptimisticMintingRequest`](../README.md#optimisticmintingrequest)

Parses a optimistic minting request using data fetched from the on-chain contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | `ContractOptimisticMintingRequest` | Data of the optimistic minting request. |

#### Returns

[`OptimisticMintingRequest`](../README.md#optimisticmintingrequest)

Parsed optimistic minting request.

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:222](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L222)

___

### requestOptimisticMint

▸ **requestOptimisticMint**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`Hex`](Hex.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) |
| `depositOutputIndex` | `number` |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

**`See`**

#### Implementation of

[TMEWCVault](../interfaces/TMEWCVault.md).[requestOptimisticMint](../interfaces/TMEWCVault.md#requestoptimisticmint)

#### Defined in

[src/lib/ethereum/tmewc-vault.ts:124](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-vault.ts#L124)
