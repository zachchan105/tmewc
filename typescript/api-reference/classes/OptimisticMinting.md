# Class: OptimisticMinting

## Table of contents

### Constructors

- [constructor](OptimisticMinting.md#constructor)

### Properties

- [tmewcContracts](OptimisticMinting.md#tmewccontracts)

### Methods

- [cancelMint](OptimisticMinting.md#cancelmint)
- [finalizeMint](OptimisticMinting.md#finalizemint)
- [getMintingRequest](OptimisticMinting.md#getmintingrequest)
- [requestMint](OptimisticMinting.md#requestmint)

## Constructors

### constructor

• **new OptimisticMinting**(`tmewcContracts`): [`OptimisticMinting`](OptimisticMinting.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `tmewcContracts` | [`TMEWCContracts`](../README.md#tmewccontracts) |

#### Returns

[`OptimisticMinting`](OptimisticMinting.md)

#### Defined in

[src/services/maintenance/optimistic-minting.ts:9](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/maintenance/optimistic-minting.ts#L9)

## Properties

### tmewcContracts

• `Private` `Readonly` **tmewcContracts**: [`TMEWCContracts`](../README.md#tmewccontracts)

#### Defined in

[src/services/maintenance/optimistic-minting.ts:7](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/maintenance/optimistic-minting.ts#L7)

## Methods

### cancelMint

▸ **cancelMint**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`Hex`](Hex.md)\>

Cancels optimistic minting for a deposit on chain.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) | The revealed deposit transaction's hash. |
| `depositOutputIndex` | `number` | Index of the deposit transaction output that funds the revealed deposit. |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

Transaction hash of the optimistic mint cancel transaction.

#### Defined in

[src/services/maintenance/optimistic-minting.ts:37](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/maintenance/optimistic-minting.ts#L37)

___

### finalizeMint

▸ **finalizeMint**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`Hex`](Hex.md)\>

Finalizes optimistic minting for a deposit on chain.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) | The revealed deposit transaction's hash. |
| `depositOutputIndex` | `number` | Index of the deposit transaction output that funds the revealed deposit. |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

Transaction hash of the optimistic mint finalize transaction.

#### Defined in

[src/services/maintenance/optimistic-minting.ts:54](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/maintenance/optimistic-minting.ts#L54)

___

### getMintingRequest

▸ **getMintingRequest**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`OptimisticMintingRequest`](../README.md#optimisticmintingrequest)\>

Gets optimistic minting request for a deposit from chain.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) | The revealed deposit transaction's hash. |
| `depositOutputIndex` | `number` | Index of the deposit transaction output that funds the revealed deposit. |

#### Returns

`Promise`\<[`OptimisticMintingRequest`](../README.md#optimisticmintingrequest)\>

Optimistic minting request.

#### Defined in

[src/services/maintenance/optimistic-minting.ts:71](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/maintenance/optimistic-minting.ts#L71)

___

### requestMint

▸ **requestMint**(`depositTxHash`, `depositOutputIndex`): `Promise`\<[`Hex`](Hex.md)\>

Requests optimistic minting for a deposit on chain.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `depositTxHash` | [`BitcoinTxHash`](BitcoinTxHash.md) | The revealed deposit transaction's hash. |
| `depositOutputIndex` | `number` | Index of the deposit transaction output that funds the revealed deposit. |

#### Returns

`Promise`\<[`Hex`](Hex.md)\>

Transaction hash of the optimistic mint request transaction.

#### Defined in

[src/services/maintenance/optimistic-minting.ts:20](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/maintenance/optimistic-minting.ts#L20)
