import { HttpLayerRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { GetLedgerStateService } from '@radix-effects/gateway'
import { createServer } from 'node:http'
import {
  Duration,
  Effect,
  Fiber,
  Layer,
  Logger,
  Option,
  Ref,
  Config as ConfigEffect
} from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'
import { DatabaseMigrations } from './db/migrate'
import { ORM } from './db/orm'
import { PgClientLive } from './db/pgClient'
import { RpcServerLive } from './rpc/server'
import {
  TransactionDetailsOptInsSchema,
  TransactionStreamConfig,
  type TransactionStreamConfigSchema,
  TransactionStreamService
} from './streamer'
import { GovernanceEventProcessor } from './streamer/governanceEvents'
import { TransactionListener } from './streamer/transactionListener'
import { VoteCalculation } from './vote-calculation/voteCalculation'
import { VoteCalculationQueue } from './vote-calculation/voteCalculationQueue'
import { VoteCalculationWorker } from './vote-calculation/voteCalculationWorker'
import { VoteReconciliation } from './vote-calculation/voteReconciliation'

// Domain services — provideMerge so Config is available to both internal services and the main program
const BaseServicesLayer = Layer.mergeAll(
  GovernanceComponent.Default,
  GovernanceEventProcessor.Default,
  Snapshot.Default,
  GetLedgerStateService.Default,
  VoteCalculation.Default,
  VoteReconciliation.Default,
  VoteCalculationWorker.Default,
  TransactionListener.Default
).pipe(
  Layer.provide(VoteCalculationQueue.Default),
  Layer.provide(ORM.Default),
  Layer.provide(StokenetGatewayApiClientLayer),
  Layer.provideMerge(Config.StokenetLive)
)

// Transaction stream config: affected_global_entities opt-in, 10s poll interval
const TransactionStreamConfigLayer = Layer.effect(
  TransactionStreamConfig,
  Ref.make<typeof TransactionStreamConfigSchema.Type>({
    stateVersion: Option.none(),
    limitPerPage: 100,
    waitTime: Duration.seconds(10),
    optIns: {
      ...TransactionDetailsOptInsSchema.make(),
      affected_global_entities: true,
      detailed_events: true
    }
  })
)

// provideMerge so TransactionStreamConfig ref is accessible to transactionListener for cursor mutation
const TransactionStreamLayer = TransactionStreamService.Default.pipe(
  Layer.provideMerge(TransactionStreamConfigLayer),
  Layer.provide(StokenetGatewayApiClientLayer)
)

// CORS must be composed into the route layer *before* serve(), because serve() consumes
// the HttpRouter internally — Layer.provide after serve() can't reach it.
const RoutesWithCors = Layer.unwrapEffect(
  Effect.gen(function* () {
    const allowedOrigins = yield* ConfigEffect.array(
      ConfigEffect.string('ALLOWED_ORIGINS')
    ).pipe(ConfigEffect.withDefault(['*']), Effect.orDie)

    return RpcServerLive.pipe(
      Layer.provide(HttpLayerRouter.cors({ allowedOrigins }))
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
    Effect.map((env) => (env === 'production' ? Logger.json : Logger.pretty))
  )
)

// Compose: services + transaction stream + HTTP server + PgClient
const AppLayer = BaseServicesLayer.pipe(
  Layer.provideMerge(TransactionStreamLayer),
  Layer.provideMerge(HttpServerLive),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(LoggerLive)
)

NodeRuntime.runMain(
  Effect.gen(function* () {
    // Phase 0: Run DB migrations (outside AppLayer so default env ConfigProvider is used)
    const migrate = yield* DatabaseMigrations
    yield* migrate()

    yield* Effect.log('Vote collector starting')
    // Phase 1: Startup reconciliation (returns stateVersion for gap-free stream start)
    const reconcile = yield* VoteReconciliation
    const startingStateVersion = yield* reconcile()

    // Phase 2: Fork consumer loop
    const runConsumer = yield* VoteCalculationWorker
    const consumerFiber = yield* Effect.fork(runConsumer())

    // Phase 3: Transaction stream listener (blocks main fiber)
    const listen = yield* TransactionListener
    yield* listen(startingStateVersion)
    return yield* Fiber.join(consumerFiber)
  }).pipe(Effect.provide([DatabaseMigrations.Default, AppLayer]))
)
