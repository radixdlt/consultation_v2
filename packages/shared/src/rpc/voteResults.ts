import { Rpc, RpcGroup } from '@effect/rpc'
import * as Schema from 'effect/Schema'

export const VoteResultSchema = Schema.Struct({
  vote: Schema.String,
  votePower: Schema.String
})

export const GetVoteResults = Rpc.make('GetVoteResults', {
  payload: { entityId: Schema.Number },
  success: Schema.Array(VoteResultSchema)
})

export const VoteResultsRpcGroup = RpcGroup.make(GetVoteResults)
