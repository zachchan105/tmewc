# Class: MaintenanceService

Service exposing features relevant to authorized maintainers and
operators of the tMEWC system.

## Table of contents

### Constructors

- [constructor](MaintenanceService.md#constructor)

### Properties

- [optimisticMinting](MaintenanceService.md#optimisticminting)
- [spv](MaintenanceService.md#spv)

## Constructors

### constructor

• **new MaintenanceService**(`tmewcContracts`, `bitcoinClient`): [`MaintenanceService`](MaintenanceService.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `tmewcContracts` | [`TMEWCContracts`](../README.md#tmewccontracts) |
| `bitcoinClient` | [`BitcoinClient`](../interfaces/BitcoinClient.md) |

#### Returns

[`MaintenanceService`](MaintenanceService.md)

#### Defined in

[src/services/maintenance/maintenance-service.ts:20](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/maintenance/maintenance-service.ts#L20)

## Properties

### optimisticMinting

• `Readonly` **optimisticMinting**: [`OptimisticMinting`](OptimisticMinting.md)

Features for optimistic minting maintainers.

#### Defined in

[src/services/maintenance/maintenance-service.ts:14](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/maintenance/maintenance-service.ts#L14)

___

### spv

• `Readonly` **spv**: [`Spv`](Spv.md)

Features for SPV proof maintainers.

#### Defined in

[src/services/maintenance/maintenance-service.ts:18](https://github.com/zachchan105/tmewc/blob/main/typescript/src/services/maintenance/maintenance-service.ts#L18)
