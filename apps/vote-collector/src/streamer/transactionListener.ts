import type { StateVersion } from '@radix-effects/shared'
import { Effect, Option, Ref, Schedule, Stream } from 'effect'
import { TransactionStreamConfig, TransactionStreamService } from '.'
import { GovernanceEventProcessor } from './governanceEvents'

export class TransactionListener extends Effect.Service<TransactionListener>()(
  'TransactionListener',
  {
    dependencies: [GovernanceEventProcessor.Default],
    effect: Effect.gen(function* () {
      const { processBatch } = yield* GovernanceEventProcessor

      return Effect.fnUntraced(function* (startingStateVersion: StateVersion) {
        // Set the stream cursor to the reconciliation stateVersion so we don't miss any txs
        const configRef = yield* TransactionStreamConfig
        yield* Ref.set(
          configRef,
          yield* Ref.get(configRef).pipe(
            Effect.map((c) => ({
              ...c,
              stateVersion: Option.some(startingStateVersion as number)
            }))
          )
        )

        const stream = yield* TransactionStreamService

        yield* Effect.log('Transaction stream started', {
          fromStateVersion: startingStateVersion
        })

        // No client-side filter needed — the local streamer applies
        // affected_global_entities_filter server-side in the Gateway API request
        yield* stream.pipe(
          Stream.runForEach((batch) =>
            Effect.gen(function* () {
              const maxSv = Math.max(...batch.map((tx) => tx.state_version))
              yield* Effect.log('Governance tx detected', {
                batchSize: batch.length,
                stateVersion: maxSv
              })

              yield* processBatch(batch)
            })
          ),
          Effect.retry(
            Schedule.exponential('5 seconds').pipe(
              Schedule.union(Schedule.spaced('60 seconds'))
            )
          )
        )
      })
    })
  }
) {}
