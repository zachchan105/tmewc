# Interface: CrossChainContractsLoader

Interface for loading TMEWC cross-chain contracts for a specific L2 chain.
It should be implemented for each supported L1 chain tMEWC ledger is deployed
on.

## Table of contents

### Properties

- [loadChainMapping](CrossChainContractsLoader.md#loadchainmapping)
- [loadL1Contracts](CrossChainContractsLoader.md#loadl1contracts)

## Properties

### loadChainMapping

• **loadChainMapping**: () => `undefined` \| [`ChainMapping`](../README.md#chainmapping)

#### Type declaration

▸ (): `undefined` \| [`ChainMapping`](../README.md#chainmapping)

Loads the chain mapping based on underlying L1 chain.

##### Returns

`undefined` \| [`ChainMapping`](../README.md#chainmapping)

#### Defined in

[src/lib/contracts/cross-chain.ts:38](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/contracts/cross-chain.ts#L38)

___

### loadL1Contracts

• **loadL1Contracts**: (`l2ChainName`: ``"Base"``) => `Promise`\<[`L1CrossChainContracts`](../README.md#l1crosschaincontracts)\>

#### Type declaration

▸ (`l2ChainName`): `Promise`\<[`L1CrossChainContracts`](../README.md#l1crosschaincontracts)\>

Loads L1-specific TMEWC cross-chain contracts for the given L2 chain.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `l2ChainName` | ``"Base"`` | Name of the L2 chain for which to load L1 contracts. |

##### Returns

`Promise`\<[`L1CrossChainContracts`](../README.md#l1crosschaincontracts)\>

#### Defined in

[src/lib/contracts/cross-chain.ts:43](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/contracts/cross-chain.ts#L43)
