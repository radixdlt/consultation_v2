import type {
  CommittedTransactionInfo,
  DetailedEventsItem,
  ProgrammaticScryptoSborValue
} from '@radixdlt/babylon-gateway-api-sdk'
import { Array as A, Effect, Option } from 'effect'
import { ProposalId, TemperatureCheckId } from 'shared/governance/brandedTypes'
import { GovernanceComponent } from 'shared/governance/index'
import type { VoteCalculationPayload } from './vote-calculation/types'

type Payload = typeof VoteCalculationPayload.Type

export class GovernanceEventProcessor extends Effect.Service<GovernanceEventProcessor>()(
  'GovernanceEventProcessor',
  {
    dependencies: [GovernanceComponent.Default],
    effect: Effect.gen(function* () {
      const governance = yield* GovernanceComponent

      const handleTemperatureCheckVoted = (event: DetailedEventsItem) =>
        Effect.gen(function* () {
          const data = event.payload
            .programmatic_json as ProgrammaticScryptoSborValue
          if (data.kind !== 'Tuple') return Option.none<Payload>()
          const idField = data.fields[0]
          if (!idField || idField.kind !== 'U64') return Option.none<Payload>()

          const id = TemperatureCheckId.make(Number(idField.value))

          yield* Effect.log('TemperatureCheckVotedEvent detected', { id })

          const tc = yield* governance.getTemperatureCheckById(id)

          return Option.some<Payload>({
            type: 'temperature_check' as const,
            entityId: id,
            keyValueStoreAddress: tc.votes,
            voteCount: tc.voteCount,
            start: tc.start.getTime()
          })
        }).pipe(Effect.orDie)

      const handleProposalVoted = (event: DetailedEventsItem) =>
        Effect.gen(function* () {
          const data = event.payload
            .programmatic_json as ProgrammaticScryptoSborValue
          if (data.kind !== 'Tuple') return Option.none<Payload>()
          const idField = data.fields[0]
          if (!idField || idField.kind !== 'U64') return Option.none<Payload>()

          const id = ProposalId.make(Number(idField.value))

          yield* Effect.log('ProposalVotedEvent detected', { id })

          const proposal = yield* governance.getProposalById(id)

          return Option.some<Payload>({
            type: 'proposal' as const,
            entityId: id,
            keyValueStoreAddress: proposal.votes,
            voteCount: proposal.voteCount,
            start: proposal.start.getTime()
          })
        }).pipe(Effect.orDie)

      const handlerMap = new Map([
        ['TemperatureCheckVotedEvent', handleTemperatureCheckVoted],
        ['ProposalVotedEvent', handleProposalVoted]
      ])

      const processBatch = (batch: CommittedTransactionInfo[]) =>
        Effect.gen(function* () {
          const events = batch.flatMap(
            (tx) => tx.receipt?.detailed_events ?? []
          )

          const options = yield* Effect.forEach(events, (event) =>
            Effect.gen(function* () {
              const handler = handlerMap.get(event.identifier.event)
              if (handler) {
                return yield* handler(event)
              }
              yield* Effect.logDebug('Unrecognized governance event', {
                name: event.identifier.event
              })
              return Option.none<Payload>()
            })
          )

          return A.getSomes(options)
        })

      return { processBatch } as const
    })
  }
) {}
