import { RpcSerialization, RpcServer } from '@effect/rpc'
import { Effect, Layer } from 'effect'
import { VoteResultsRpcGroup } from 'shared/rpc/voteResults'
import { ORM } from '../db/orm'
import { VoteCalculationRepo } from '../vote-calculation/voteCalculationRepo'

const HandlersLive = VoteResultsRpcGroup.toLayer(
  Effect.gen(function* () {
    const repo = yield* VoteCalculationRepo
    return {
      GetVoteResults: ({ type, entityId }) =>
        repo.getResultsByEntity(type, entityId),
      GetAccountVotes: ({ type, entityId }) =>
        repo.getAccountVotesByEntity(type, entityId)
    }
  })
)

export const RpcServerLive = RpcServer.layerHttpRouter({
  group: VoteResultsRpcGroup,
  path: '/rpc',
  protocol: 'http'
}).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(VoteCalculationRepo.Default),
  Layer.provide(ORM.Default)
)
