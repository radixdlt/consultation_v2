import { AccountAddress } from '@radix-effects/shared'
import { Rpc, RpcGroup } from '@effect/rpc'
import * as Schema from 'effect/Schema'
import { EntityId, EntityType } from '../governance/brandedTypes'

export const VoteResultSchema = Schema.Struct({
  vote: Schema.String,
  votePower: Schema.String
})

export const AccountVoteSchema = Schema.Struct({
  accountAddress: AccountAddress,
  vote: Schema.String,
  votePower: Schema.String
})

export const GetVoteResultsResponse = Schema.Struct({
  results: Schema.Array(VoteResultSchema),
  isCalculating: Schema.Boolean
})

export const GetVoteResults = Rpc.make('GetVoteResults', {
  payload: {
    type: EntityType,
    entityId: EntityId
  },
  success: GetVoteResultsResponse
})

export const GetAccountVotes = Rpc.make('GetAccountVotes', {
  payload: {
    type: EntityType,
    entityId: EntityId
  },
  success: Schema.Array(AccountVoteSchema)
})

export const VoteResultsRpcGroup = RpcGroup.make(GetVoteResults, GetAccountVotes)
