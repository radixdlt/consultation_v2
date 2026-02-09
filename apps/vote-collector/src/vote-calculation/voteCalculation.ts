import { GetLedgerStateService } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import { Array as A, Effect, pipe, Record as R } from 'effect'
import { GovernanceComponent } from 'shared/governance/index'
import { KeyValueStoreAddress } from 'shared/schemas'
import { Snapshot } from 'shared/snapshot/snapshot'
import type { VoteCalculationPayload } from './types'
import { VoteCalculationRepo } from './voteCalculationRepo'

export class VoteCalculation extends Effect.Service<VoteCalculation>()(
  'VoteCalculation',
  {
    dependencies: [
      VoteCalculationRepo.Default,
      GovernanceComponent.Default,
      GetLedgerStateService.Default,
      Snapshot.Default
    ],
    effect: Effect.gen(function* () {
      const repo = yield* VoteCalculationRepo
      const governance = yield* GovernanceComponent
      const ledgerState = yield* GetLedgerStateService
      const snapshot = yield* Snapshot

      return Effect.fnUntraced(function* (
        payload: typeof VoteCalculationPayload.Type
      ) {
        yield* Effect.log('Starting vote calculation', {
          type: payload.type,
          entityId: payload.entityId,
          voteCount: payload.voteCount
        })

        // Step 1: Get or create state row, read last processed vote count
        const stateId = yield* repo.getOrCreateStateId(
          payload.type,
          payload.entityId
        )

        const lastVoteCount = yield* repo.getLastVoteCount(
          payload.type,
          payload.entityId
        )

        yield* Effect.log('Last vote count', { lastVoteCount })

        // No new votes to process — short-circuit
        if (payload.voteCount <= lastVoteCount) {
          yield* Effect.log('No new votes, short-circuiting')
          return {
            type: payload.type,
            entityId: payload.entityId,
            results: A.empty<{ vote: string; votePower: string }>()
          }
        }

        yield* Effect.log('New votes detected', {
          newVoteCount: payload.voteCount - lastVoteCount
        })

        // Step 2: Fetch ALL votes at current state version, filter to new ones
        const currentSv = yield* ledgerState({
          at_ledger_state: { timestamp: new Date() }
        }).pipe(Effect.map((r) => StateVersion.make(r.state_version)))

        const newVotes = yield* governance.getTemperatureCheckVotesByIndex({
          stateVersion: currentSv,
          keyValueStoreAddress: KeyValueStoreAddress.make(
            payload.keyValueStoreAddress
          ),
          fromIndexInclusive: lastVoteCount,
          toIndexInclusive: payload.voteCount
        })

        yield* Effect.log('Fetched new votes', { count: newVotes.length })

        // Step 3: Get state version at TC START DATE (for balance snapshot)
        const snapshotStateVersion = yield* ledgerState({
          at_ledger_state: { timestamp: new Date(payload.start) }
        }).pipe(Effect.map((r) => r.state_version))

        yield* Effect.log('Snapshot state version resolved', {
          snapshotStateVersion,
          snapshotDate: new Date(payload.start).toISOString()
        })

        // Step 4: Snapshot balances ONLY for new voters (at TC start date)
        const newBalances = yield* Effect.gen(function* () {
          if (A.isEmptyReadonlyArray(newVotes)) return {}
          const addresses = pipe(
            newVotes,
            A.map((v) => v.accountAddress)
          )
          const result = yield* snapshot({
            addresses,
            stateVersion: StateVersion.make(snapshotStateVersion)
          })
          return R.map(result, (balances) =>
            pipe(
              R.values(balances),
              A.reduce(new BigNumber(0), (sum, v) => sum.plus(v))
            )
          )
        })

        yield* Effect.log('Snapshotted balances', {
          voterCount: R.size(newBalances)
        })

        // Step 5: Aggregate new vote power, UPSERT into results, update state
        // Aggregate new voting power per vote option
        const newPower = pipe(
          newVotes,
          A.groupBy((v) => v.vote),
          R.map((votes) =>
            pipe(
              votes,
              A.reduce(new BigNumber(0), (sum, v) =>
                sum.plus(newBalances[v.accountAddress] ?? new BigNumber(0))
              )
            )
          )
        )

        // Upsert: add new power to existing totals
        yield* Effect.forEach(R.toEntries(newPower), ([vote, votePower]) =>
          repo.upsertVotePower({
            stateId,
            vote,
            votePower: votePower.toFixed()
          })
        )

        // Update lastVoteCount on all rows for this entity
        yield* repo.updateLastVoteCount(
          payload.type,
          payload.entityId,
          payload.voteCount
        )

        // Return current totals
        const totals = yield* repo.getResultsByEntity(
          payload.type,
          payload.entityId
        )
        const results = pipe(
          totals,
          A.map((r) => ({ vote: r.vote, votePower: r.votePower }))
        )

        yield* Effect.log('Vote calculation complete', { results })

        return { type: payload.type, entityId: payload.entityId, results }
      })
    })
  }
) {}
