import { FetchHttpClient } from '@effect/platform'
import { RpcClient, RpcSerialization } from '@effect/rpc'
import { Layer } from 'effect'
import { envVars } from './envVars'

export const VoteResultsProtocolLive = RpcClient.layerProtocolHttp({
  url: `${envVars.VOTE_COLLECTOR_URL}/rpc`
}).pipe(
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer)
)
