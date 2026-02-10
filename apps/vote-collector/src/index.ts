import { HttpLayerRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { GetLedgerStateService } from '@radix-effects/gateway'
import { createServer } from 'node:http'
import { Duration, Effect, Fiber, Layer, Option, Ref } from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'
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

// HTTP server for RPC endpoints — starts via layer lifecycle alongside the worker
const HttpServerLive = RpcServerLive.pipe(
  Layer.provide(HttpLayerRouter.layer),
  Layer.provide(
    NodeHttpServer.layer(() => createServer(), { port: 3001 })
  )
)

// Compose: services + transaction stream + HTTP server + PgClient
const AppLayer = BaseServicesLayer.pipe(
  Layer.provideMerge(TransactionStreamLayer),
  Layer.provideMerge(HttpServerLive),
  Layer.provideMerge(PgClientLive)
)

NodeRuntime.runMain(
  Effect.gen(function* () {
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
  }).pipe(Effect.provide(AppLayer))
)
