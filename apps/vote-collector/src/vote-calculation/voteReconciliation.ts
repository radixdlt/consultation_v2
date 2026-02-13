import { GetLedgerStateService } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { Array as A, Effect } from 'effect'
import { ProposalId, TemperatureCheckId } from 'shared/governance/brandedTypes'
import { GovernanceComponent } from 'shared/governance/index'
import { KeyValueStoreAddress } from 'shared/schemas'
import { VoteCalculationQueue } from './voteCalculationQueue'
import { VoteCalculationRepo } from './voteCalculationRepo'

export class VoteReconciliation extends Effect.Service<VoteReconciliation>()(
  'VoteReconciliation',
  {
    dependencies: [
      GovernanceComponent.Default,
      VoteCalculationRepo.Default,
      GetLedgerStateService.Default
    ],
    effect: Effect.gen(function* () {
      const { upsert } = yield* VoteCalculationQueue
      const governance = yield* GovernanceComponent
      const repo = yield* VoteCalculationRepo
      const ledgerState = yield* GetLedgerStateService

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

      const reconcileOneProposal = (proposalId: ProposalId) =>
        Effect.gen(function* () {
          const proposal = yield* governance.getProposalById(proposalId)

          const dbLastVoteCount = yield* repo.getLastVoteCount(
            'proposal',
            proposalId
          )

          yield* Effect.log('Reconciling proposal', {
            id: proposalId,
            onChainVoteCount: proposal.voteCount,
            dbLastVoteCount
          })

          if (proposal.voteCount > dbLastVoteCount) {
            yield* Effect.log('Stale proposal detected', {
              id: proposalId,
              onChainVoteCount: proposal.voteCount,
              dbLastVoteCount
            })

            yield* upsert({
              type: 'proposal',
              entityId: proposalId,
              keyValueStoreAddress: KeyValueStoreAddress.make(proposal.votes),
              voteCount: proposal.voteCount,
              start: proposal.start.getTime()
            })
          }
        })

      return Effect.fn('VoteReconciliation.run')(
        function* () {
          yield* repo.resetAllCalculating()
          yield* Effect.log('Reset stale isCalculating flags')

          const govState = yield* governance.getGovernanceState()
          const currentState = yield* ledgerState({})

          yield* Effect.log('Startup reconciliation', {
            temperatureCheckCount: govState.temperatureCheckCount,
            proposalCount: govState.proposalCount,
            stateVersion: currentState.state_version
          })

          const temperatureCheckIds = A.range(
            0,
            govState.temperatureCheckCount - 1
          ).map((i) => TemperatureCheckId.make(i))

          yield* Effect.forEach(temperatureCheckIds, reconcileOne, {
            concurrency: 5,
            discard: true
          })

          const proposalIds = A.range(0, govState.proposalCount - 1).map((i) =>
            ProposalId.make(i)
          )

          yield* Effect.forEach(proposalIds, reconcileOneProposal, {
            concurrency: 5,
            discard: true
          })

          yield* Effect.log('Startup reconciliation complete')

          return StateVersion.make(currentState.state_version)
        },
        Effect.annotateLogs({ service: 'VoteReconciliation' })
      )
    })
  }
) {}
