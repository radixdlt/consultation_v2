import type {
  CommittedTransactionInfo,
  DetailedEventsItem,
  ProgrammaticScryptoSborValue
} from '@radixdlt/babylon-gateway-api-sdk'
import { Effect } from 'effect'
import { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { GovernanceComponent } from 'shared/governance/index'
import { VoteCalculationQueue } from '../vote-calculation/voteCalculationQueue'

export class GovernanceEventProcessor extends Effect.Service<GovernanceEventProcessor>()(
  'GovernanceEventProcessor',
  {
    dependencies: [GovernanceComponent.Default],
    effect: Effect.gen(function* () {
      const governance = yield* GovernanceComponent
      const { upsert } = yield* VoteCalculationQueue

      const handleTemperatureCheckVoted = (event: DetailedEventsItem) =>
        Effect.gen(function* () {
          const data = event.payload
            .programmatic_json as ProgrammaticScryptoSborValue
          if (data.kind !== 'Tuple') return
          const idField = data.fields[0]
          if (!idField || idField.kind !== 'U64') return

          const id = TemperatureCheckId.make(Number(idField.value))

          yield* Effect.log('TemperatureCheckVotedEvent detected', { id })

          const tc = yield* governance.getTemperatureCheckById(id)

          yield* upsert({
            type: 'temperature_check',
            entityId: id,
            keyValueStoreAddress: String(tc.votes),
            voteCount: tc.voteCount,
            start: tc.start.getTime()
          })
        })

      const handlerMap = new Map<
        string,
        (event: DetailedEventsItem) => Effect.Effect<void, unknown>
      >([['TemperatureCheckVotedEvent', handleTemperatureCheckVoted]])

      const processBatch = (batch: CommittedTransactionInfo[]) =>
        Effect.gen(function* () {
          const events = batch.flatMap(
            (tx) => tx.receipt?.detailed_events ?? []
          )

          yield* Effect.forEach(events, (event) =>
            Effect.gen(function* () {
              const handler = handlerMap.get(event.identifier.event)
              if (handler) {
                yield* handler(event)
              } else {
                yield* Effect.logDebug('Unrecognized governance event', {
                  name: event.identifier.event
                })
              }
            })
          )
        })

      return { processBatch } as const
    })
  }
) {}
