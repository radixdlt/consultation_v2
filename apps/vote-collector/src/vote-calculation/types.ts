import { Schema } from 'effect'
import { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { KeyValueStoreAddress } from 'shared/schemas'

export const VoteCalculationPayload = Schema.Struct({
  type: EntityType,
  entityId: EntityId,
  keyValueStoreAddress: KeyValueStoreAddress,
  voteCount: Schema.Number,
  start: Schema.Number
})
