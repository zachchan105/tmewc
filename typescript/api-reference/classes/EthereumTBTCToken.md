# Class: EthereumTMEWCToken

Implementation of the Ethereum TMEWC token handle.

**`See`**

for reference.

## Hierarchy

- `EthersContractHandle`\<`TMEWCTypechain`\>

  ↳ **`EthereumTMEWCToken`**

## Implements

- [`TMEWCToken`](../interfaces/TMEWCToken.md)

## Table of contents

### Constructors

- [constructor](EthereumTMEWCToken.md#constructor)

### Properties

- [\_deployedAtBlockNumber](EthereumTMEWCToken.md#_deployedatblocknumber)
- [\_instance](EthereumTMEWCToken.md#_instance)
- [\_totalRetryAttempts](EthereumTMEWCToken.md#_totalretryattempts)

### Methods

- [buildBridgeRequestRedemptionData](EthereumTMEWCToken.md#buildbridgerequestredemptiondata)
- [buildRequestRedemptionData](EthereumTMEWCToken.md#buildrequestredemptiondata)
- [getAddress](EthereumTMEWCToken.md#getaddress)
- [getChainIdentifier](EthereumTMEWCToken.md#getchainidentifier)
- [getEvents](EthereumTMEWCToken.md#getevents)
- [requestRedemption](EthereumTMEWCToken.md#requestredemption)
- [totalSupply](EthereumTMEWCToken.md#totalsupply)

## Constructors

### constructor

• **new EthereumTMEWCToken**(`config`, `chainId?`): [`EthereumTMEWCToken`](EthereumTMEWCToken.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `config` | [`EthereumContractConfig`](../interfaces/EthereumContractConfig.md) | `undefined` |
| `chainId` | [`Ethereum`](../enums/Chains.Ethereum.md) | `Chains.Ethereum.Local` |

#### Returns

[`EthereumTMEWCToken`](EthereumTMEWCToken.md)

#### Overrides

EthersContractHandle\&lt;TMEWCTypechain\&gt;.constructor

#### Defined in

[src/lib/ethereum/tmewc-token.ts:26](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-token.ts#L26)

## Properties

### \_deployedAtBlockNumber

• `Protected` `Readonly` **\_deployedAtBlockNumber**: `number`

Number of a block within which the contract was deployed. Value is read from
the contract deployment artifact. It can be overwritten by setting a
[EthersContractConfig.deployedAtBlockNumber](../interfaces/EthereumContractConfig.md#deployedatblocknumber) property.

#### Inherited from

EthersContractHandle.\_deployedAtBlockNumber

#### Defined in

[src/lib/ethereum/adapter.ts:80](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L80)

___

### \_instance

• `Protected` `Readonly` **\_instance**: `TMEWC`

Ethers instance of the deployed contract.

#### Inherited from

EthersContractHandle.\_instance

#### Defined in

[src/lib/ethereum/adapter.ts:74](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L74)

___

### \_totalRetryAttempts

• `Protected` `Readonly` **\_totalRetryAttempts**: `number`

Number of retries for ethereum requests.

#### Inherited from

EthersContractHandle.\_totalRetryAttempts

#### Defined in

[src/lib/ethereum/adapter.ts:84](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L84)

## Methods

### buildBridgeRequestRedemptionData

▸ **buildBridgeRequestRedemptionData**(`walletPublicKey`, `mainUtxo`, `redeemerOutputScript`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `walletPublicKey` | [`Hex`](Hex.md) |
| `mainUtxo` | [`BitcoinUtxo`](../README.md#bitcoinutxo) |
| `redeemerOutputScript` | [`Hex`](Hex.md) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `mainUtxo` | \{ `txHash`: `string` ; `txOutputIndex`: `number` = mainUtxo.outputIndex; `txOutputValue`: `BigNumber` = mainUtxo.value } |
| `mainUtxo.txHash` | `string` |
| `mainUtxo.txOutputIndex` | `number` |
| `mainUtxo.txOutputValue` | `BigNumber` |
| `prefixedRawRedeemerOutputScript` | `string` |
| `walletPublicKeyHash` | `string` |

#### Defined in

[src/lib/ethereum/tmewc-token.ts:135](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-token.ts#L135)

___

### buildRequestRedemptionData

▸ **buildRequestRedemptionData**(`redeemer`, `walletPublicKey`, `mainUtxo`, `redeemerOutputScript`): [`Hex`](Hex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `redeemer` | [`EthereumAddress`](EthereumAddress.md) |
| `walletPublicKey` | [`Hex`](Hex.md) |
| `mainUtxo` | [`BitcoinUtxo`](../README.md#bitcoinutxo) |
| `redeemerOutputScript` | [`Hex`](Hex.md) |

#### Returns

[`Hex`](Hex.md)

#### Defined in

[src/lib/ethereum/tmewc-token.ts:104](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-token.ts#L104)

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

[src/lib/ethereum/adapter.ts:112](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L112)

___

### getChainIdentifier

▸ **getChainIdentifier**(): [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

#### Returns

[`ChainIdentifier`](../interfaces/ChainIdentifier.md)

**`See`**

#### Implementation of

[TMEWCToken](../interfaces/TMEWCToken.md).[getChainIdentifier](../interfaces/TMEWCToken.md#getchainidentifier)

#### Defined in

[src/lib/ethereum/tmewc-token.ts:53](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-token.ts#L53)

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

[src/lib/ethereum/adapter.ts:127](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/adapter.ts#L127)

___

### requestRedemption

▸ **requestRedemption**(`walletPublicKey`, `mainUtxo`, `redeemerOutputScript`, `amount`): `Promise`\<[`Hex`](Hex.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `walletPublicKey` | [`Hex`](Hex.md) |
| `mainUtxo` | [`BitcoinUtxo`](../README.md#bitcoinutxo) |
| `redeemerOutputScript` | [`Hex`](Hex.md) |
| `amount` | `BigNumber` |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

**`See`**

#### Implementation of

[TMEWCToken](../interfaces/TMEWCToken.md).[requestRedemption](../interfaces/TMEWCToken.md#requestredemption)

#### Defined in

[src/lib/ethereum/tmewc-token.ts:71](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-token.ts#L71)

___

### totalSupply

▸ **totalSupply**(`blockNumber?`): `Promise`\<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `blockNumber?` | `number` |

#### Returns

`Promise`\<`BigNumber`\>

**`See`**

#### Implementation of

[TMEWCToken](../interfaces/TMEWCToken.md).[totalSupply](../interfaces/TMEWCToken.md#totalsupply)

#### Defined in

[src/lib/ethereum/tmewc-token.ts:61](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/ethereum/tmewc-token.ts#L61)
