import { StateVersion } from '@radix-effects/shared'
import { Array as A, Effect } from 'effect'
import { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { GovernanceComponent } from 'shared/governance/index'
import { KeyValueStoreAddress } from 'shared/schemas'
import { VoteCalculationQueue } from './voteCalculationQueue'
import { VoteCalculationRepo } from './voteCalculationRepo'

export class VoteReconciliation extends Effect.Service<VoteReconciliation>()(
  'VoteReconciliation',
  {
    dependencies: [GovernanceComponent.Default, VoteCalculationRepo.Default],
    effect: Effect.gen(function* () {
      const { upsert } = yield* VoteCalculationQueue
      const governance = yield* GovernanceComponent
      const repo = yield* VoteCalculationRepo

      const reconcileOne = (temperatureCheckId: TemperatureCheckId) =>
        Effect.gen(function* () {
          const tc =
            yield* governance.getTemperatureCheckById(temperatureCheckId)

          const dbLastVoteCount = yield* repo.getLastVoteCount(
            'temperature_check',
            temperatureCheckId
          )

          yield* Effect.log('Reconciling temperature check', {
            id: temperatureCheckId,
            onChainVoteCount: tc.voteCount,
            dbLastVoteCount
          })

          if (tc.voteCount > dbLastVoteCount) {
            yield* Effect.log('Stale TC detected', {
              id: temperatureCheckId,
              onChainVoteCount: tc.voteCount,
              dbLastVoteCount
            })

            yield* upsert({
              type: 'temperature_check',
              entityId: temperatureCheckId,
              keyValueStoreAddress: KeyValueStoreAddress.make(tc.votes),
              voteCount: tc.voteCount,
              start: tc.start.getTime()
            })
          }
        })

      return Effect.fn('VoteReconciliation.run')(
        function* () {
          const govState = yield* governance.getGovernanceState()

          yield* Effect.log('Startup reconciliation', {
            temperatureCheckCount: govState.temperatureCheckCount,
            stateVersion: govState.stateVersion
          })

          const temperatureCheckIds = A.range(
            0,
            govState.temperatureCheckCount - 1
          ).map((i) => TemperatureCheckId.make(i))

          yield* Effect.forEach(temperatureCheckIds, reconcileOne, {
            concurrency: 5,
            discard: true
          })

          yield* Effect.log('Startup reconciliation complete')

          return StateVersion.make(govState.stateVersion)
        },
        Effect.annotateLogs({ service: 'VoteReconciliation' })
      )
    })
  }
) {}
