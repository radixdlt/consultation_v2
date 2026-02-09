import { Schema } from 'effect'

export const VoteCalculationPayload = Schema.Struct({
  type: Schema.Literal('temperature_check'),
  entityId: Schema.Number,
  keyValueStoreAddress: Schema.String,
  voteCount: Schema.Number,
  start: Schema.Number
})
