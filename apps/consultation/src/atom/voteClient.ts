import { FetchHttpClient, HttpClient, HttpClientRequest } from '@effect/platform'
import { Context, Data, Effect, Layer, Schema } from 'effect'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { makeAtomRuntime } from '@/atom/makeRuntimeAtom'
import { envVars } from '@/lib/envVars'

const VoteResultSchema = Schema.Struct({
  vote: Schema.String,
  votePower: Schema.String
})

const GetVoteResultsResponse = Schema.Struct({
  results: Schema.Array(VoteResultSchema)
})

const AccountVoteSchema = Schema.Struct({
  accountAddress: Schema.String,
  vote: Schema.String,
  votePower: Schema.String
})

export class VoteClientError extends Data.TaggedError('VoteClientError')<{
  message: string
}> {}

export class VoteClient extends Context.Tag('VoteClient')<
  VoteClient,
  {
    readonly GetVoteResults: (params: {
      type: EntityType
      entityId: EntityId
    }) => Effect.Effect<typeof GetVoteResultsResponse.Type, VoteClientError>
    readonly GetAccountVotes: (params: {
      type: EntityType
      entityId: EntityId
    }) => Effect.Effect<
      ReadonlyArray<typeof AccountVoteSchema.Type>,
      VoteClientError
    >
  }
>() {}

const VoteClientLive = Layer.effect(
  VoteClient,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const baseUrl = envVars.VOTE_COLLECTOR_URL

    return {
      GetVoteResults: ({ type, entityId }) =>
        client
          .execute(
            HttpClientRequest.get(
              `${baseUrl}/vote-results?type=${type}&entityId=${entityId}`
            )
          )
          .pipe(
            Effect.flatMap((res) => res.json),
            Effect.flatMap(Schema.decodeUnknown(GetVoteResultsResponse)),
            Effect.scoped,
            Effect.catchAll((e) =>
              new VoteClientError({ message: String(e) })
            )
          ),
      GetAccountVotes: ({ type, entityId }) =>
        client
          .execute(
            HttpClientRequest.get(
              `${baseUrl}/account-votes?type=${type}&entityId=${entityId}`
            )
          )
          .pipe(
            Effect.flatMap((res) => res.json),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(AccountVoteSchema))
            ),
            Effect.scoped,
            Effect.catchAll((e) =>
              new VoteClientError({ message: String(e) })
            )
          )
    }
  })
)

export const voteClientRuntime = makeAtomRuntime(
  VoteClientLive.pipe(Layer.provide(FetchHttpClient.layer))
)
