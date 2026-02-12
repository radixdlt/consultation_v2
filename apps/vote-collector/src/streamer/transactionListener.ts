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
        yield* Ref.update(configRef, (c) => ({
          ...c,
          stateVersion: Option.some(startingStateVersion)
        }))

        const stream = yield* TransactionStreamService

        yield* Effect.log('Transaction stream started', {
          fromStateVersion: startingStateVersion
        })

        // No client-side filter needed — the local streamer applies
        // affected_global_entities_filter server-side in the Gateway API request
        yield* stream.pipe(
          Stream.runForEach(({ items, nextStateVersion }) =>
            Effect.gen(function* () {
              const maxSv = Math.max(...items.map((tx) => tx.state_version))
              yield* Effect.log('Governance tx detected', {
                batchSize: items.length,
                stateVersion: maxSv
              })

              yield* processBatch(items)

              yield* Ref.update(configRef, (c) => ({
                ...c,
                stateVersion: Option.some(nextStateVersion)
              }))
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
