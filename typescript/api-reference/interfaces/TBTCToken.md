# Interface: TMEWCToken

Interface for communication with the TMEWC token on-chain contract.

## Implemented by

- [`EthereumTMEWCToken`](../classes/EthereumTMEWCToken.md)

## Table of contents

### Methods

- [getChainIdentifier](TMEWCToken.md#getchainidentifier)
- [requestRedemption](TMEWCToken.md#requestredemption)
- [totalSupply](TMEWCToken.md#totalsupply)

## Methods

### getChainIdentifier

▸ **getChainIdentifier**(): [`ChainIdentifier`](ChainIdentifier.md)

Gets the chain-specific identifier of this contract.

#### Returns

[`ChainIdentifier`](ChainIdentifier.md)

#### Defined in

[src/lib/contracts/tmewc-token.ts:13](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/contracts/tmewc-token.ts#L13)

___

### requestRedemption

▸ **requestRedemption**(`walletPublicKey`, `mainUtxo`, `redeemerOutputScript`, `amount`): `Promise`\<[`Hex`](../classes/Hex.md)\>

Requests redemption in one transaction using the `approveAndCall` function
from the tMEWC on-chain token contract. Then the tMEWC token contract calls
the `receiveApproval` function from the `TMEWCVault` contract which burns
tMEWC tokens and requests redemption.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `walletPublicKey` | [`Hex`](../classes/Hex.md) | The Meowcoin public key of the wallet. Must be in the compressed form (33 bytes long with 02 or 03 prefix). |
| `mainUtxo` | [`BitcoinUtxo`](../README.md#bitcoinutxo) | The main UTXO of the wallet. Must match the main UTXO held by the on-chain Bridge contract. |
| `redeemerOutputScript` | [`Hex`](../classes/Hex.md) | The output script that the redeemed funds will be locked to. Must not be prepended with length. |
| `amount` | `BigNumber` | The amount to be redeemed with the precision of the tMEWC on-chain token contract. |

#### Returns

`Promise`\<[`Hex`](../classes/Hex.md)\>

Transaction hash of the approve and call transaction.

#### Defined in

[src/lib/contracts/tmewc-token.ts:40](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/contracts/tmewc-token.ts#L40)

___

### totalSupply

▸ **totalSupply**(`blockNumber?`): `Promise`\<`BigNumber`\>

Gets the total supply of the TMEWC token. The returned value is in
ERC 1e18 precision, it has to be converted before using as Meowcoin value
with 1e8 precision in satoshi.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional parameter determining the block the total supply should be fetched for. If this parameter is not set, the total supply is taken for the latest block. |

#### Returns

`Promise`\<`BigNumber`\>

#### Defined in

[src/lib/contracts/tmewc-token.ts:23](https://github.com/keep-network/tmewc/blob/main/typescript/src/lib/contracts/tmewc-token.ts#L23)
