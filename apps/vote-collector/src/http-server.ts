import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  Effect,
  ManagedRuntime,
  ParseResult,
  Schedule,
  Schema,
  Config,
  Option
} from 'effect'
import { EntityType } from 'shared/governance/index'
import { HttpServerLayer } from './layers'
import { PollLock } from './pollLock'
import { PollService } from './poll'
import { VoteCalculationRepo } from './vote-calculation/voteCalculationRepo'
import { DatabaseMigrations } from './db/migrate'

const QueryParams = Schema.Struct({
  type: EntityType,
  entityId: Schema.NumberFromString
})

const runtime = ManagedRuntime.make(HttpServerLayer)

// --- Poll scheduler ---

const pollSchedule = Effect.gen(function* () {
  const withPollLock = yield* PollLock
  const poll = yield* PollService
  yield* withPollLock(poll())
}).pipe(
  Effect.catchTag('PollLockNotAcquired', () =>
    Effect.log('Poll lock held by another instance, skipping')
  ),
  Effect.tapErrorCause((cause) => Effect.logError('Poll failed', cause)),
  Effect.catchAllCause(() => Effect.void),
  Effect.repeat(Schedule.spaced('1 minutes'))
)

// --- Hono app ---

const app = new Hono()
app.use(cors())

app.get('/vote-results', async (c) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const parsed = yield* Schema.decodeUnknown(QueryParams)(c.req.query(), {
        errors: 'all'
      })
      const repo = yield* VoteCalculationRepo
      const results = yield* repo.getResultsByEntity(
        parsed.type,
        parsed.entityId
      )
      return c.json(results)
    }).pipe(
      Effect.catchTag('ParseError', (error) =>
        Effect.succeed(
          c.json(
            {
              error: 'Invalid query parameters',
              details: ParseResult.ArrayFormatter.formatErrorSync(error)
            },
            400
          )
        )
      ),
      Effect.catchAllDefect((defect) =>
        Effect.logError('Unhandled defect in getVoteResults', defect).pipe(
          Effect.as(c.json({ error: 'Internal server error' }, 500))
        )
      )
    )
  )
)

app.get('/account-votes', async (c) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const parsed = yield* Schema.decodeUnknown(QueryParams)(c.req.query(), {
        errors: 'all'
      })
      const repo = yield* VoteCalculationRepo
      const votes = yield* repo.getAccountVotesByEntity(
        parsed.type,
        parsed.entityId
      )
      return c.json(votes)
    }).pipe(
      Effect.catchTag('ParseError', (error) =>
        Effect.succeed(
          c.json(
            {
              error: 'Invalid query parameters',
              details: ParseResult.ArrayFormatter.formatErrorSync(error)
            },
            400
          )
        )
      ),
      Effect.catchAllDefect((defect) =>
        Effect.logError('Unhandled defect in getAccountVotes', defect).pipe(
          Effect.as(c.json({ error: 'Internal server error' }, 500))
        )
      )
    )
  )
)

// --- Startup ---

runtime.runPromise(
  Effect.gen(function* () {
    const httpPort = (yield* Config.option(Config.number('SERVER_PORT'))).pipe(
      Option.getOrElse(() => 4000)
    )

    const dbMigrations = yield* DatabaseMigrations
    yield* dbMigrations()
    yield* Effect.forkDaemon(pollSchedule)
    yield* Effect.logInfo('Poll scheduler started (1 minute interval)')
    serve({ fetch: app.fetch, port: httpPort })
    yield* Effect.log(`Server running on http://localhost:${httpPort}`)
  })
)
