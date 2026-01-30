import { NodeRuntime } from '@effect/platform-node'
import { GetLedgerStateService } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { Effect, Layer } from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'

const EnvLayer = Layer.mergeAll(
  GovernanceComponent.Default,
  Snapshot.Default,
  GetLedgerStateService.Default
).pipe(
  Layer.provide(StokenetGatewayApiClientLayer),
  Layer.provide(Config.StokenetLive)
)

NodeRuntime.runMain(
  Effect.gen(function* () {
    const governanceComponent = yield* GovernanceComponent
    const snapshotService = yield* Snapshot
    const ledgerState = yield* GetLedgerStateService

    const stateVersion = yield* ledgerState({
      at_ledger_state: {
        timestamp: new Date()
      }
    }).pipe(Effect.map((result) => StateVersion.make(result.state_version)))

    const temperatureChecks =
      yield* governanceComponent.getTemperatureChecks(stateVersion)

    yield* Effect.log(JSON.stringify(temperatureChecks, null, 2))

    const temperatureChecksVotes =
      yield* governanceComponent.getTemperatureChecksVotes({
        stateVersion,
        keyValueStoreAddress: temperatureChecks[0].votes
      })

    // yield* Effect.log(JSON.stringify(temperatureChecksVotes, null, 2))

    const addresses = temperatureChecksVotes.map((vote) => vote.accountAddress)

    const snapshot = yield* snapshotService({
      addresses,
      stateVersion
    })

    yield* Effect.log(snapshot)
  }).pipe(Effect.provide(EnvLayer))
)
