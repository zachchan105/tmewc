# Interface: Function\<T\>

[GetChainEvents](../modules/GetChainEvents.md).Function

Represents a generic function to get events emitted on the chain.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ChainEvent`](ChainEvent.md) |

## Callable

### Function

▸ **Function**(`options?`, `...filterArgs`): `Promise`\<`T`[]\>

Get emitted events.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options?` | [`Options`](GetChainEvents.Options.md) | Options for getting events. |
| `...filterArgs` | `any`[] | Arguments for events filtering. |

#### Returns

`Promise`\<`T`[]\>

Array of found events.

#### Defined in

[src/lib/contracts/chain-event.ts:60](https://github.com/zachchan105/tmewc/blob/main/typescript/src/lib/contracts/chain-event.ts#L60)
