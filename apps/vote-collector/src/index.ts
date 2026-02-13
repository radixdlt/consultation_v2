import { HttpLayerRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { GetLedgerStateService } from '@radix-effects/gateway'
import { createServer } from 'node:http'
import { Effect, Layer, Logger, Config as ConfigEffect, Data } from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'
import { DatabaseMigrations } from './db/migrate'
import { ORM } from './db/orm'
import { PgClientLive } from './db/pgClient'
import { RpcServerLive } from './rpc/server'
import { SseRouteLive } from './sse/sseRoute'
import { VoteUpdatePubSub } from './sse/voteUpdatePubSub'
import {
  TransactionStreamConfigLayer,
  TransactionStreamService
} from './streamer'
import { GovernanceEventProcessor } from './streamer/governanceEvents'
import { TransactionListener } from './streamer/transactionListener'
import { VoteCalculation } from './vote-calculation/voteCalculation'
import { VoteCalculationQueue } from './vote-calculation/voteCalculationQueue'
import { VoteCalculationWorker } from './vote-calculation/voteCalculationWorker'
import { VoteReconciliation } from './vote-calculation/voteReconciliation'

class UnsupportedNetworkIdError extends Data.TaggedError(
  '@VoteCollector/UnsupportedNetworkIdError'
)<{
  message: string
}> {}

const BaseServicesLayer = Layer.mergeAll(
  GovernanceComponent.Default,
  GovernanceEventProcessor.Default,
  Snapshot.Default,
  GetLedgerStateService.Default,
  VoteCalculation.Default,
  VoteReconciliation.Default,
  VoteCalculationWorker.Default,
  TransactionListener.Default,
  TransactionStreamService.Default
).pipe(
  Layer.provide(VoteCalculationQueue.Default),
  Layer.provideMerge(TransactionStreamConfigLayer),
  Layer.provide(ORM.Default),
  Layer.provide(StokenetGatewayApiClientLayer),
  Layer.provideMerge(VoteUpdatePubSub.Default),
  Layer.provideMerge(
    Layer.unwrapEffect(
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
  )
)

// CORS must be composed into the route layer *before* serve(), because serve() consumes
// the HttpRouter internally — Layer.provide after serve() can't reach it.
const RoutesWithCors = Layer.unwrapEffect(
  Effect.gen(function* () {
    const allowedOrigins = yield* ConfigEffect.array(
      ConfigEffect.string('ALLOWED_ORIGINS')
    ).pipe(ConfigEffect.withDefault(['*']), Effect.orDie)

    return Layer.mergeAll(RpcServerLive, SseRouteLive).pipe(
      Layer.provide(HttpLayerRouter.cors({ allowedOrigins })),
      Layer.provide(VoteUpdatePubSub.Default)
    )
  })
)

const HttpServerLive = HttpLayerRouter.serve(RoutesWithCors).pipe(
  Layer.provide(
    Layer.unwrapEffect(
      ConfigEffect.number('PORT').pipe(
        ConfigEffect.withDefault(3001),
        Effect.map((port) =>
          NodeHttpServer.layer(() => createServer(), { port })
        )
      )
    )
  )
)

// JSON in production, pretty in development
const LoggerLive = Layer.unwrapEffect(
  ConfigEffect.string('NODE_ENV').pipe(
    ConfigEffect.withDefault('development'),
    Effect.map((env) => (env === 'production' ? Logger.json : Logger.pretty)),
    Effect.orDie
  )
)

// Compose: services + transaction stream + HTTP server + PgClient
const AppLayer = BaseServicesLayer.pipe(
  Layer.provideMerge(HttpServerLive),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(LoggerLive)
)

NodeRuntime.runMain(
  Effect.gen(function* () {
    yield* Effect.log('Vote collector starting migrations')
    // Phase 0: Run DB migrations
    const migrate = yield* DatabaseMigrations
    yield* migrate()

    yield* Effect.log('Vote collector starting')
    // Phase 1: Startup reconciliation (returns stateVersion for gap-free stream start)
    const reconcile = yield* VoteReconciliation
    const startingStateVersion = yield* reconcile()

    // Phase 2: Run consumer + listener concurrently (fail-fast on either crash)
    const transactionStreamConsumer = yield* VoteCalculationWorker
    const transactionListener = yield* TransactionListener

    yield* Effect.log(
      'Vote collector starting transaction stream consumer and listener',
      {
        startingStateVersion
      }
    )
    yield* Effect.all(
      [transactionStreamConsumer(), transactionListener(startingStateVersion)],
      {
        concurrency: 2
      }
    )
  }).pipe(Effect.provide([DatabaseMigrations.Default, AppLayer]))
)
