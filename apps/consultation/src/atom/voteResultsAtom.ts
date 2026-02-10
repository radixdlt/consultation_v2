import { Atom } from '@effect-atom/atom-react'
import { RpcClient } from '@effect/rpc'
import { Effect } from 'effect'
import { VoteResultsRpcGroup } from 'shared/rpc/voteResults'
import { makeAtomRuntime } from '@/atom/makeRuntimeAtom'
import { VoteResultsProtocolLive } from '@/lib/rpcClient'

const runtime = makeAtomRuntime(VoteResultsProtocolLive)

export const voteResultsAtom = Atom.family((entityId: number) =>
  runtime.atom(
    Effect.gen(function* () {
      const client = yield* RpcClient.make(VoteResultsRpcGroup)
      return yield* client.GetVoteResults({ entityId })
    })
  )
)
