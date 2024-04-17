# Class: TMEWC

Entrypoint component of the tMEWC SDK.

## Table of contents

### Constructors

- [constructor](TMEWC.md#constructor)

### Properties

- [#crossChainContracts](TMEWC.md##crosschaincontracts)
- [#crossChainContractsLoader](TMEWC.md##crosschaincontractsloader)
- [bitcoinClient](TMEWC.md#bitcoinclient)
- [deposits](TMEWC.md#deposits)
- [maintenance](TMEWC.md#maintenance)
- [redemptions](TMEWC.md#redemptions)
- [tmewcContracts](TMEWC.md#tmewccontracts)

### Methods

- [crossChainContracts](TMEWC.md#crosschaincontracts)
- [initializeCrossChain](TMEWC.md#initializecrosschain)
- [initializeCustom](TMEWC.md#initializecustom)
- [initializeEthereum](TMEWC.md#initializeethereum)
- [initializeMainnet](TMEWC.md#initializemainnet)
- [initializeSepolia](TMEWC.md#initializesepolia)

## Constructors

### constructor

• **new TMEWC**(`tmewcContracts`, `bitcoinClient`, `crossChainContractsLoader?`): [`TMEWC`](TMEWC.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `tmewcContracts` | [`TMEWCContracts`](../README.md#tmewccontracts) |
| `bitcoinClient` | [`BitcoinClient`](../interfaces/BitcoinClient.md) |
| `crossChainContractsLoader?` | [`CrossChainContractsLoader`](../interfaces/CrossChainContractsLoader.md) |

#### Returns

[`TMEWC`](TMEWC.md)

#### Defined in

[src/services/tmewc.ts:59](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L59)

## Properties

### #crossChainContracts

• `Private` `Readonly` **#crossChainContracts**: `Map`\<``"Base"``, [`CrossChainContracts`](../README.md#crosschaincontracts)\>

Mapping of cross-chain contracts for different supported L2 chains.
Each set of cross-chain contracts must be first initialized using
the `initializeCrossChain` method.

#### Defined in

[src/services/tmewc.ts:57](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L57)

___

### #crossChainContractsLoader

• `Private` `Optional` `Readonly` **#crossChainContractsLoader**: [`CrossChainContractsLoader`](../interfaces/CrossChainContractsLoader.md)

Reference to the cross-chain contracts loader.

#### Defined in

[src/services/tmewc.ts:51](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L51)

___

### bitcoinClient

• `Readonly` **bitcoinClient**: [`BitcoinClient`](../interfaces/BitcoinClient.md)

Meowcoin client handle for low-level access.

#### Defined in

[src/services/tmewc.ts:47](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L47)

___

### deposits

• `Readonly` **deposits**: [`DepositsService`](DepositsService.md)

Service supporting the tMEWC deposit flow.

#### Defined in

[src/services/tmewc.ts:30](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L30)

___

### maintenance

• `Readonly` **maintenance**: [`MaintenanceService`](MaintenanceService.md)

Service supporting authorized operations of tMEWC system maintainers
and operators.

#### Defined in

[src/services/tmewc.ts:35](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L35)

___

### redemptions

• `Readonly` **redemptions**: [`RedemptionsService`](RedemptionsService.md)

Service supporting the tMEWC redemption flow.

#### Defined in

[src/services/tmewc.ts:39](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L39)

___

### tmewcContracts

• `Readonly` **tmewcContracts**: [`TMEWCContracts`](../README.md#tmewccontracts)

Handle to tMEWC contracts for low-level access.

#### Defined in

[src/services/tmewc.ts:43](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L43)

## Methods

### crossChainContracts

▸ **crossChainContracts**(`l2ChainName`): `undefined` \| [`CrossChainContracts`](../README.md#crosschaincontracts)

Gets cross-chain contracts for the given supported L2 chain.
The given L2 chain contracts must be first initialized using the
`initializeCrossChain` method.

 THIS IS EXPERIMENTAL CODE THAT CAN BE CHANGED OR REMOVED
              IN FUTURE RELEASES. IT SHOULD BE USED ONLY FOR INTERNAL
              PURPOSES AND EXTERNAL APPLICATIONS SHOULD NOT DEPEND ON IT.
              CROSS-CHAIN SUPPORT IS NOT FULLY OPERATIONAL YET.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `l2ChainName` | ``"Base"`` | Name of the L2 chain for which to get cross-chain contracts. |

#### Returns

`undefined` \| [`CrossChainContracts`](../README.md#crosschaincontracts)

Cross-chain contracts for the given L2 chain or
         undefined if not initialized.

#### Defined in

[src/services/tmewc.ts:252](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L252)

___

### initializeCrossChain

▸ **initializeCrossChain**(`l2ChainName`, `l2Signer`): `Promise`\<`void`\>

Initializes cross-chain contracts for the given L2 chain, using the
given signer. Updates the signer on subsequent calls.

 THIS IS EXPERIMENTAL CODE THAT CAN BE CHANGED OR REMOVED
              IN FUTURE RELEASES. IT SHOULD BE USED ONLY FOR INTERNAL
              PURPOSES AND EXTERNAL APPLICATIONS SHOULD NOT DEPEND ON IT.
              CROSS-CHAIN SUPPORT IS NOT FULLY OPERATIONAL YET.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `l2ChainName` | ``"Base"`` | Name of the L2 chain for which to initialize cross-chain contracts. |
| `l2Signer` | [`EthereumSigner`](../README.md#ethereumsigner) | Signer to use with the L2 chain contracts. |

#### Returns

`Promise`\<`void`\>

Void promise.

**`Throws`**

Throws an error if:
        - Cross-chain contracts loader is not available for this TMEWC SDK instance,
        - Chain mapping between the L1 and the given L2 chain is not defined.

**`Dev`**

In case this function needs to support non-EVM L2 chains that can't
     use EthereumSigner as a signer type, the l2Signer parameter should
     probably be turned into a union of multiple supported types or
     generalized in some other way.

#### Defined in

[src/services/tmewc.ts:198](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L198)

___

### initializeCustom

▸ **initializeCustom**(`tmewcContracts`, `bitcoinClient`): `Promise`\<[`TMEWC`](TMEWC.md)\>

Initializes the tMEWC SDK entrypoint with custom tMEWC contracts and
Meowcoin client.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tmewcContracts` | [`TMEWCContracts`](../README.md#tmewccontracts) | Custom tMEWC contracts handle. |
| `bitcoinClient` | [`BitcoinClient`](../interfaces/BitcoinClient.md) | Custom Meowcoin client implementation. |

#### Returns

`Promise`\<[`TMEWC`](TMEWC.md)\>

Initialized tMEWC SDK entrypoint.

**`Dev`**

This function is especially useful for local development as it gives
     flexibility to combine different implementations of tMEWC contracts
     with different Meowcoin networks.

#### Defined in

[src/services/tmewc.ts:170](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L170)

___

### initializeEthereum

▸ **initializeEthereum**(`signer`, `ethereumChainId`, `bitcoinNetwork`, `crossChainSupport?`): `Promise`\<[`TMEWC`](TMEWC.md)\>

Initializes the tMEWC SDK entrypoint for the given Ethereum network and Meowcoin network.
The initialized instance uses default Electrum servers to interact
with Meowcoin network.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `signer` | [`EthereumSigner`](../README.md#ethereumsigner) | `undefined` | Ethereum signer. |
| `ethereumChainId` | [`Ethereum`](../enums/Chains.Ethereum.md) | `undefined` | Ethereum chain ID. |
| `bitcoinNetwork` | [`BitcoinNetwork`](../enums/BitcoinNetwork-1.md) | `undefined` | Meowcoin network. |
| `crossChainSupport` | `boolean` | `false` | Whether to enable cross-chain support. False by default. |

#### Returns

`Promise`\<[`TMEWC`](TMEWC.md)\>

Initialized tMEWC SDK entrypoint.

**`Throws`**

Throws an error if the underlying signer's Ethereum network is
        other than the given Ethereum network.

#### Defined in

[src/services/tmewc.ts:123](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L123)

___

### initializeMainnet

▸ **initializeMainnet**(`signer`): `Promise`\<[`TMEWC`](TMEWC.md)\>

Initializes the tMEWC SDK entrypoint for Ethereum and Meowcoin mainnets.
The initialized instance uses default Electrum servers to interact
with Meowcoin mainnet

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | [`EthereumSigner`](../README.md#ethereumsigner) | Ethereum signer. |

#### Returns

`Promise`\<[`TMEWC`](TMEWC.md)\>

Initialized tMEWC SDK entrypoint.

**`Throws`**

Throws an error if the signer's Ethereum network is other than
        Ethereum mainnet.

#### Defined in

[src/services/tmewc.ts:86](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L86)

___

### initializeSepolia

▸ **initializeSepolia**(`signer`): `Promise`\<[`TMEWC`](TMEWC.md)\>

Initializes the tMEWC SDK entrypoint for Ethereum Sepolia and Meowcoin testnet.
The initialized instance uses default Electrum servers to interact
with Meowcoin testnet

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signer` | [`EthereumSigner`](../README.md#ethereumsigner) | Ethereum signer. |

#### Returns

`Promise`\<[`TMEWC`](TMEWC.md)\>

Initialized tMEWC SDK entrypoint.

**`Throws`**

Throws an error if the signer's Ethereum network is other than
        Ethereum mainnet.

#### Defined in

[src/services/tmewc.ts:103](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/tmewc.ts#L103)
