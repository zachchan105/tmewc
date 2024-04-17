# Class: RedemptionsService

Service exposing features related to tMEWC redemptions.

## Table of contents

### Constructors

- [constructor](RedemptionsService.md#constructor)

### Properties

- [bitcoinClient](RedemptionsService.md#bitcoinclient)
- [tmewcContracts](RedemptionsService.md#tmewccontracts)

### Methods

- [determineWalletMainUtxo](RedemptionsService.md#determinewalletmainutxo)
- [findWalletForRedemption](RedemptionsService.md#findwalletforredemption)
- [getRedemptionRequests](RedemptionsService.md#getredemptionrequests)
- [requestRedemption](RedemptionsService.md#requestredemption)

## Constructors

### constructor

• **new RedemptionsService**(`tmewcContracts`, `bitcoinClient`): [`RedemptionsService`](RedemptionsService.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `tmewcContracts` | [`TMEWCContracts`](../README.md#tmewccontracts) |
| `bitcoinClient` | [`BitcoinClient`](../interfaces/BitcoinClient.md) |

#### Returns

[`RedemptionsService`](RedemptionsService.md)

#### Defined in

[src/services/redemptions/redemptions-service.ts:30](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L30)

## Properties

### bitcoinClient

• `Private` `Readonly` **bitcoinClient**: [`BitcoinClient`](../interfaces/BitcoinClient.md)

Meowcoin client handle.

#### Defined in

[src/services/redemptions/redemptions-service.ts:28](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L28)

___

### tmewcContracts

• `Private` `Readonly` **tmewcContracts**: [`TMEWCContracts`](../README.md#tmewccontracts)

Handle to tMEWC contracts.

#### Defined in

[src/services/redemptions/redemptions-service.ts:24](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L24)

## Methods

### determineWalletMainUtxo

▸ **determineWalletMainUtxo**(`walletPublicKeyHash`, `bitcoinNetwork`): `Promise`\<`undefined` \| [`BitcoinUtxo`](../README.md#bitcoinutxo)\>

Determines the plain-text wallet main UTXO currently registered in the
Bridge on-chain contract. The returned main UTXO can be undefined if the
wallet does not have a main UTXO registered in the Bridge at the moment.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `walletPublicKeyHash` | [`Hex`](Hex.md) | Public key hash of the wallet. |
| `bitcoinNetwork` | [`BitcoinNetwork`](../enums/BitcoinNetwork-1.md) | Meowcoin network. |

#### Returns

`Promise`\<`undefined` \| [`BitcoinUtxo`](../README.md#bitcoinutxo)\>

Promise holding the wallet main UTXO or undefined value.

#### Defined in

[src/services/redemptions/redemptions-service.ts:225](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L225)

___

### findWalletForRedemption

▸ **findWalletForRedemption**(`redeemerOutputScript`, `amount`): `Promise`\<\{ `mainUtxo`: [`BitcoinUtxo`](../README.md#bitcoinutxo) ; `walletPublicKey`: [`Hex`](Hex.md)  }\>

Finds the oldest live wallet that has enough MEWC to handle a redemption
request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `redeemerOutputScript` | [`Hex`](Hex.md) | The redeemer output script the redeemed funds are supposed to be locked on. Must not be prepended with length. |
| `amount` | `BigNumber` | The amount to be redeemed in satoshis. |

#### Returns

`Promise`\<\{ `mainUtxo`: [`BitcoinUtxo`](../README.md#bitcoinutxo) ; `walletPublicKey`: [`Hex`](Hex.md)  }\>

Promise with the wallet details needed to request a redemption.

#### Defined in

[src/services/redemptions/redemptions-service.ts:106](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L106)

___

### getRedemptionRequests

▸ **getRedemptionRequests**(`bitcoinRedeemerAddress`, `walletPublicKey`, `type?`): `Promise`\<[`RedemptionRequest`](../interfaces/RedemptionRequest.md)\>

Gets data of a registered redemption request from the Bridge contract.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `bitcoinRedeemerAddress` | `string` | `undefined` | Meowcoin redeemer address used to request the redemption. |
| `walletPublicKey` | [`Hex`](Hex.md) | `undefined` | Meowcoin public key of the wallet handling the redemption. Must be in the compressed form (33 bytes long with 02 or 03 prefix). |
| `type` | ``"pending"`` \| ``"timedOut"`` | `"pending"` | Type of redemption requests the function will look for. Can be either `pending` or `timedOut`. By default, `pending` is used. |

#### Returns

`Promise`\<[`RedemptionRequest`](../interfaces/RedemptionRequest.md)\>

Matching redemption requests.

**`Throws`**

Throws an error if no redemption request exists for the given
        input parameters.

#### Defined in

[src/services/redemptions/redemptions-service.ts:337](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L337)

___

### requestRedemption

▸ **requestRedemption**(`bitcoinRedeemerAddress`, `amount`): `Promise`\<\{ `targetChainTxHash`: [`Hex`](Hex.md) ; `walletPublicKey`: [`Hex`](Hex.md)  }\>

Requests a redemption of TMEWC token into MEWC.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bitcoinRedeemerAddress` | `string` | Meowcoin address redeemed MEWC should be sent to. Only P2PKH, P2WPKH, P2SH, and P2WSH address types are supported. |
| `amount` | `BigNumber` | The amount to be redeemed with the precision of the tMEWC on-chain token contract. |

#### Returns

`Promise`\<\{ `targetChainTxHash`: [`Hex`](Hex.md) ; `walletPublicKey`: [`Hex`](Hex.md)  }\>

Object containing:
         - Target chain hash of the request redemption transaction
           (for example, Ethereum transaction hash)
         - Meowcoin public key of the wallet asked to handle the redemption.
           Presented in the compressed form (33 bytes long with 02 or 03 prefix).

#### Defined in

[src/services/redemptions/redemptions-service.ts:48](https://github.com/keep-network/tmewc/blob/main/typescript/src/services/redemptions/redemptions-service.ts#L48)
