import { RpcClient, type RpcClientError } from '@effect/rpc'
import { Context, Layer } from 'effect'
import { VoteResultsRpcGroup } from 'shared/rpc/voteResults'
import { makeAtomRuntime } from '@/atom/makeRuntimeAtom'
import { VoteResultsProtocolLive } from '@/lib/rpcClient'
import { VoteEventSource } from '@/lib/voteEventSource'

export class VoteClient extends Context.Tag('VoteClient')<
  VoteClient,
  RpcClient.FromGroup<typeof VoteResultsRpcGroup, RpcClientError.RpcClientError>
>() {}

const VoteClientLive = Layer.scoped(
  VoteClient,
  RpcClient.make(VoteResultsRpcGroup)
)

export const voteClientRuntime = makeAtomRuntime(
  Layer.mergeAll(
    VoteClientLive.pipe(Layer.provide(VoteResultsProtocolLive)),
    VoteEventSource.Default
  )
)
