import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2
} from 'aws-lambda'
import {
  Effect,
  Layer,
  Logger,
  Schema,
  ManagedRuntime,
  ParseResult
} from 'effect'

import { EntityType, GovernanceConfigLayer } from 'shared/governance/index'
import { ORM } from './db/orm'
import { PgClientLive } from './db/pgClient'
import { PollService } from './poll'
import { PollLock } from './pollLock'
import { VoteCalculationRepo } from './vote-calculation/voteCalculationRepo'
import { GatewayApiClientLayer } from 'shared/gateway'

const CronJobHandlerLayer = PollService.Default.pipe(
  Layer.provideMerge(PollLock.Default),
  Layer.provide(ORM.Default),
  Layer.provideMerge(GatewayApiClientLayer),
  Layer.provideMerge(GovernanceConfigLayer),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(Logger.json)
)

const HttpHandlerLayer = VoteCalculationRepo.Default.pipe(
  Layer.provide(ORM.Default),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(Logger.json)
)

const CronRuntime = ManagedRuntime.make(CronJobHandlerLayer)
const HttpRuntime = ManagedRuntime.make(HttpHandlerLayer)

const QueryParams = Schema.Struct({
  type: EntityType,
  entityId: Schema.NumberFromString
})

// Cron handler: poll for new governance transactions
export const poll = async () =>
  CronRuntime.runPromise(
    Effect.gen(function* () {
      const withPollLock = yield* PollLock
      const poll = yield* PollService
      yield* withPollLock(poll())
    }).pipe(
      Effect.catchTag('PollLockNotAcquired', () =>
        Effect.log('Poll lock held by another invocation, skipping')
      ),
      Effect.tapErrorCause((cause) => Effect.logError('Poll failed', cause))
    )
  )

// GET /vote-results
export const getVoteResults = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> =>
  HttpRuntime.runPromise(
    Effect.gen(function* () {
      const parsed = yield* Schema.decodeUnknown(QueryParams)(
        event.queryStringParameters ?? {},
        {
          errors: 'all'
        }
      ).pipe(
        Effect.mapError((error) => ({
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invalid query parameters',
            details: ParseResult.ArrayFormatter.formatErrorSync(error)
          })
        }))
      )
      const repo = yield* VoteCalculationRepo
      const results = yield* repo.getResultsByEntity(
        parsed.type,
        parsed.entityId
      )
      return {
        statusCode: 200,
        body: JSON.stringify(results)
      }
    }).pipe(
      Effect.catchAllDefect((defect) =>
        Effect.logError('Unhandled defect in getVoteResults', defect).pipe(
          Effect.as({
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
          })
        )
      )
    )
  )

// GET /account-votes
export const getAccountVotes = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> =>
  HttpRuntime.runPromise(
    Effect.gen(function* () {
      const parsed = yield* Schema.decodeUnknown(QueryParams)(
        event.queryStringParameters ?? {},
        {
          errors: 'all'
        }
      ).pipe(
        Effect.mapError((error) => ({
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invalid query parameters',
            details: ParseResult.ArrayFormatter.formatErrorSync(error)
          })
        }))
      )
      const repo = yield* VoteCalculationRepo
      const votes = yield* repo.getAccountVotesByEntity(
        parsed.type,
        parsed.entityId
      )
      return {
        statusCode: 200,
        body: JSON.stringify(votes)
      }
    }).pipe(
      Effect.catchAllDefect((defect) =>
        Effect.logError('Unhandled defect in getAccountVotes', defect).pipe(
          Effect.as({
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
          })
        )
      )
    )
  )
