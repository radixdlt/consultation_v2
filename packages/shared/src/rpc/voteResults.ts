import { Rpc, RpcGroup } from '@effect/rpc'
import * as Schema from 'effect/Schema'
import { EntityId, EntityType } from '../governance/brandedTypes'

export const VoteResultSchema = Schema.Struct({
  vote: Schema.String,
  votePower: Schema.String
})

export const GetVoteResults = Rpc.make('GetVoteResults', {
  payload: {
    type: EntityType,
    entityId: EntityId
  },
  success: Schema.Array(VoteResultSchema)
})

export const VoteResultsRpcGroup = RpcGroup.make(GetVoteResults)
