import { Schema } from 'effect'
import { KeyValueStoreAddress } from 'shared/schemas'

export const VoteCalculationPayload = Schema.Struct({
  type: Schema.Literal('temperature_check', 'proposal'),
  entityId: Schema.Number,
  keyValueStoreAddress: KeyValueStoreAddress,
  voteCount: Schema.Number,
  start: Schema.Number
})
