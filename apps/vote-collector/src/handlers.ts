import { GetLedgerStateService } from '@radix-effects/gateway'
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2
} from 'aws-lambda'
import {
  Config as ConfigEffect,
  Data,
  Effect,
  Layer,
  Logger,
  ParseResult,
  Schema
} from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, EntityType, GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'
import { ORM } from './db/orm'
import { PgClientLive } from './db/pgClient'
import { PollService } from './poll'
import { GovernanceEventProcessor } from './streamer/governanceEvents'
import { VoteCalculation } from './vote-calculation/voteCalculation'
import { VoteCalculationRepo } from './vote-calculation/voteCalculationRepo'

class UnsupportedNetworkIdError extends Data.TaggedError(
  '@VoteCollector/UnsupportedNetworkIdError'
)<{
  message: string
}> {}

const GovernanceConfigLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const networkId = yield* ConfigEffect.number('NETWORK_ID').pipe(
      ConfigEffect.withDefault(2),
      Effect.orDie
    )
    if (networkId === 1) {
      return yield* new UnsupportedNetworkIdError({
        message: `Mainnet (network ID 1) is not supported yet`
      })
    } else if (networkId === 2) {
      return Config.StokenetLive
    } else {
      return yield* new UnsupportedNetworkIdError({
        message: `Unsupported network ID: ${networkId}`
      })
    }
  })
)

const AppLayer = Layer.mergeAll(
  GovernanceComponent.Default,
  GovernanceEventProcessor.Default,
  Snapshot.Default,
  GetLedgerStateService.Default,
  VoteCalculation.Default,
  VoteCalculationRepo.Default,
  PollService.Default
).pipe(
  Layer.provide(ORM.Default),
  Layer.provideMerge(StokenetGatewayApiClientLayer),
  Layer.provideMerge(GovernanceConfigLayer),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(Logger.json)
)

const QueryParams = Schema.Struct({
  type: EntityType,
  entityId: Schema.NumberFromString
})

const withQueryParams = <A, I>(
  schema: Schema.Schema<A, I, never>,
  event: APIGatewayProxyEventV2,
  handler: (params: A) => Effect.Effect<unknown, never, any>
): Promise<APIGatewayProxyResultV2> =>
  Effect.runPromise(
    Schema.decodeUnknown(schema)(event.queryStringParameters ?? {}, { errors: "all" }).pipe(
      Effect.mapError(
        (e) =>
          ({
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid query parameters', details: ParseResult.ArrayFormatter.formatErrorSync(e) })
          }) as APIGatewayProxyResultV2
      ),
      Effect.flatMap(handler),
      Effect.map(
        (result) =>
          ({
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(result)
          }) as APIGatewayProxyResultV2
      ),
      Effect.catchAll(Effect.succeed),
      Effect.catchAllDefect(
        () =>
          Effect.succeed({
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
          } as APIGatewayProxyResultV2)
      ),
      Effect.provide(AppLayer)
    ) as Effect.Effect<APIGatewayProxyResultV2>
  )

// Cron handler: poll for new governance transactions
export const poll = async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const poll = yield* PollService
      yield* poll
    }).pipe(Effect.provide(AppLayer))
  )
}

// GET /vote-results
export const getVoteResults = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> =>
  withQueryParams(QueryParams, event, ({ type, entityId }) =>
    Effect.gen(function* () {
      const repo = yield* VoteCalculationRepo
      return yield* repo.getResultsByEntity(type, entityId)
    })
  )

// GET /account-votes
export const getAccountVotes = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> =>
  withQueryParams(QueryParams, event, ({ type, entityId }) =>
    Effect.gen(function* () {
      const repo = yield* VoteCalculationRepo
      return yield* repo.getAccountVotesByEntity(type, entityId)
    })
  )
