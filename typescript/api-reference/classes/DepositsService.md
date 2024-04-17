# Class: DepositsService

Service exposing features related to tMEWC deposits.

## Table of contents

### Constructors

- [constructor](DepositsService.md#constructor)

### Properties

- [#crossChainContracts](DepositsService.md##crosschaincontracts)
- [#defaultDepositor](DepositsService.md##defaultdepositor)
- [bitcoinClient](DepositsService.md#bitcoinclient)
- [depositRefundLocktimeDuration](DepositsService.md#depositrefundlocktimeduration)
- [tmewcContracts](DepositsService.md#tmewccontracts)

### Methods

- [generateDepositReceipt](DepositsService.md#generatedepositreceipt)
- [initiateCrossChainDeposit](DepositsService.md#initiatecrosschaindeposit)
- [initiateDeposit](DepositsService.md#initiatedeposit)
- [initiateDepositWithProxy](DepositsService.md#initiatedepositwithproxy)
- [setDefaultDepositor](DepositsService.md#setdefaultdepositor)

## Constructors

### constructor

• **new DepositsService**(`tmewcContracts`, `bitcoinClient`, `crossChainContracts`): [`DepositsService`](DepositsService.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `tmewcContracts` | [`TMEWCContracts`](../README.md#tmewccontracts) |
| `bitcoinClient` | [`BitcoinClient`](../interfaces/BitcoinClient.md) |
| `crossChainContracts` | (`_`: ``"Base"``) => `undefined` \| [`CrossChainContracts`](../README.md#crosschaincontracts) |

#### Returns

[`DepositsService`](DepositsService.md)

#### Defined in

[src/services/deposits/deposits-service.ts:51](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L51)

## Properties

### #crossChainContracts

• `Private` `Readonly` **#crossChainContracts**: (`_`: ``"Base"``) => `undefined` \| [`CrossChainContracts`](../README.md#crosschaincontracts)

#### Type declaration

▸ (`_`): `undefined` \| [`CrossChainContracts`](../README.md#crosschaincontracts)

Gets cross-chain contracts for the given supported L2 chain.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_` | ``"Base"`` | Name of the L2 chain for which to get cross-chain contracts. |

##### Returns

`undefined` \| [`CrossChainContracts`](../README.md#crosschaincontracts)

Cross-chain contracts for the given L2 chain or
         undefined if not initialized.

#### Defined in

[src/services/deposits/deposits-service.ts:49](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L49)

___

### #defaultDepositor

• `Private` **#defaultDepositor**: `undefined` \| [`ChainIdentifier`](../interfaces/ChainIdentifier.md)

Chain-specific identifier of the default depositor used for deposits
initiated by this service.

#### Defined in

[src/services/deposits/deposits-service.ts:42](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L42)

___

### bitcoinClient

• `Private` `Readonly` **bitcoinClient**: [`BitcoinClient`](../interfaces/BitcoinClient.md)

Meowcoin client handle.

#### Defined in

[src/services/deposits/deposits-service.ts:37](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L37)

___

### depositRefundLocktimeDuration

• `Private` `Readonly` **depositRefundLocktimeDuration**: ``23328000``

Deposit refund locktime duration in seconds.
This is 9 month in seconds assuming 1 month = 30 days

#### Defined in

[src/services/deposits/deposits-service.ts:29](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L29)

___

### tmewcContracts

• `Private` `Readonly` **tmewcContracts**: [`TMEWCContracts`](../README.md#tmewccontracts)

Handle to tMEWC contracts.

#### Defined in

[src/services/deposits/deposits-service.ts:33](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L33)

## Methods

### generateDepositReceipt

▸ **generateDepositReceipt**(`bitcoinRecoveryAddress`, `depositor`, `extraData?`): `Promise`\<[`DepositReceipt`](../interfaces/DepositReceipt.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `bitcoinRecoveryAddress` | `string` |
| `depositor` | [`ChainIdentifier`](../interfaces/ChainIdentifier.md) |
| `extraData?` | [`Hex`](Hex.md) |

#### Returns

`Promise`\<[`DepositReceipt`](../interfaces/DepositReceipt.md)\>

#### Defined in

[src/services/deposits/deposits-service.ts:183](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L183)

___

### initiateCrossChainDeposit

▸ **initiateCrossChainDeposit**(`bitcoinRecoveryAddress`, `l2ChainName`): `Promise`\<[`Deposit`](Deposit.md)\>

Initiates the tMEWC cross-chain deposit process. A cross-chain deposit
is a deposit that targets an L2 chain other than the L1 chain the tMEWC
system is deployed on. Such a deposit is initiated using a transaction
on the L2 chain. To make it happen, the given L2 cross-chain contracts
must be initialized along with a L2 signer first.

 THIS IS EXPERIMENTAL CODE THAT CAN BE CHANGED OR REMOVED
              IN FUTURE RELEASES. IT SHOULD BE USED ONLY FOR INTERNAL
              PURPOSES AND EXTERNAL APPLICATIONS SHOULD NOT DEPEND ON IT.
              CROSS-CHAIN SUPPORT IS NOT FULLY OPERATIONAL YET.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bitcoinRecoveryAddress` | `string` | P2PKH or P2WPKH Meowcoin address that can be used for emergency recovery of the deposited funds. |
| `l2ChainName` | ``"Base"`` | Name of the L2 chain the deposit is targeting. |

#### Returns

`Promise`\<[`Deposit`](Deposit.md)\>

Handle to the initiated deposit process.

**`Throws`**

Throws an error if one of the following occurs:
        - There are no active wallet in the Bridge contract
        - The Meowcoin recovery address is not a valid P2(W)PKH
        - The cross-chain contracts for the given L2 chain are not
          initialized
        - The L2 deposit owner cannot be resolved. This typically
          happens if the L2 cross-chain contracts operate with a
          read-only signer whose address cannot be resolved.

**`See`**

for cross-chain contracts initialization.

**`Dev`**

This is actually a call to initiateDepositWithProxy with a built-in
     depositor proxy.

#### Defined in

[src/services/deposits/deposits-service.ts:163](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L163)

___

### initiateDeposit

▸ **initiateDeposit**(`bitcoinRecoveryAddress`, `extraData?`): `Promise`\<[`Deposit`](Deposit.md)\>

Initiates the tMEWC deposit process.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bitcoinRecoveryAddress` | `string` | P2PKH or P2WPKH Meowcoin address that can be used for emergency recovery of the deposited funds. |
| `extraData?` | [`Hex`](Hex.md) | Optional 32-byte extra data to be included in the deposit script. Cannot be equal to 32 zero bytes. |

#### Returns

`Promise`\<[`Deposit`](Deposit.md)\>

Handle to the initiated deposit process.

**`Throws`**

Throws an error if one of the following occurs:
        - The default depositor is not set
        - There are no active wallet in the Bridge contract
        - The Meowcoin recovery address is not a valid P2(W)PKH
        - The optional extra data is set but is not 32-byte or equals
          to 32 zero bytes.

#### Defined in

[src/services/deposits/deposits-service.ts:76](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L76)

___

### initiateDepositWithProxy

▸ **initiateDepositWithProxy**(`bitcoinRecoveryAddress`, `depositorProxy`, `extraData?`): `Promise`\<[`Deposit`](Deposit.md)\>

Initiates the tMEWC deposit process using a depositor proxy.
The depositor proxy initiates minting on behalf of the user (i.e. original
depositor) and receives minted TMEWC. This allows the proxy to provide
additional services to the user, such as routing the minted TMEWC tokens
to another protocols, in an automated way.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bitcoinRecoveryAddress` | `string` | P2PKH or P2WPKH Meowcoin address that can be used for emergency recovery of the deposited funds. |
| `depositorProxy` | [`DepositorProxy`](../interfaces/DepositorProxy.md) | Depositor proxy used to initiate the deposit. |
| `extraData?` | [`Hex`](Hex.md) | Optional 32-byte extra data to be included in the deposit script. Cannot be equal to 32 zero bytes. |

#### Returns

`Promise`\<[`Deposit`](Deposit.md)\>

Handle to the initiated deposit process.

**`See`**

DepositorProxy

**`Throws`**

Throws an error if one of the following occurs:
        - There are no active wallet in the Bridge contract
        - The Meowcoin recovery address is not a valid P2(W)PKH
        - The optional extra data is set but is not 32-byte or equals
          to 32 zero bytes.

#### Defined in

[src/services/deposits/deposits-service.ts:115](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L115)

___

### setDefaultDepositor

▸ **setDefaultDepositor**(`defaultDepositor`): `void`

Sets the default depositor used for deposits initiated by this service.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `defaultDepositor` | [`ChainIdentifier`](../interfaces/ChainIdentifier.md) | Chain-specific identifier of the default depositor. |

#### Returns

`void`

**`Dev`**

Typically, there is no need to use this method when DepositsService
     is orchestrated automatically. However, there are some use cases
     where setting the default depositor explicitly may be useful.
     Make sure you know what you are doing while using this method.

#### Defined in

[src/services/deposits/deposits-service.ts:261](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/deposits/deposits-service.ts#L261)
