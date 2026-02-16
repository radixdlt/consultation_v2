import { GetLedgerStateService } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import { Array as A, Effect, flow, pipe, Record as R } from 'effect'
import { GovernanceComponent } from 'shared/governance/index'
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

        // Step 2: Fetch raw votes, deduplicate by account (last vote wins)
        // Dedup BEFORE fan-out so same-batch revotes are handled correctly
        const dedupedVotes = yield* (() => {
          if (payload.type === 'temperature_check') {
            return governance
              .getTemperatureCheckVotesByIndex({
                keyValueStoreAddress: payload.keyValueStoreAddress,
                fromIndexInclusive: lastVoteCount,
                toIndexInclusive: payload.voteCount
              })
              .pipe(
                Effect.map(
                  flow(
                    A.reverse,
                    A.dedupeWith(
                      (a, b) => a.accountAddress === b.accountAddress
                    ),
                    A.map((v) => ({
                      accountAddress: v.accountAddress,
                      votes: [v.vote]
                    }))
                  )
                )
              )
          }
          return governance
            .getProposalVotesByIndex({
              keyValueStoreAddress: payload.keyValueStoreAddress,
              fromIndexInclusive: lastVoteCount,
              toIndexInclusive: payload.voteCount
            })
            .pipe(
              Effect.map(
                flow(
                  A.reverse,
                  A.dedupeWith((a, b) => a.accountAddress === b.accountAddress),
                  A.map((v) => ({
                    accountAddress: v.accountAddress,
                    votes: v.options.map(String)
                  }))
                )
              )
            )
        })()

        yield* Effect.log('Fetched and deduped votes', {
          count: dedupedVotes.length
        })

        // Step 3: Check which accounts already have DB entries (= revotes)
        const existingAccountVotes = yield* repo.getAccountVotesByAddresses(
          stateId,
          dedupedVotes.map((v) => v.accountAddress)
        )

        const existingByAccount = pipe(
          existingAccountVotes,
          A.groupBy((v) => v.accountAddress as string)
        )

        const firstTimeVotes = dedupedVotes.filter(
          (v) => !(v.accountAddress in existingByAccount)
        )
        const revotingVotes = dedupedVotes.filter(
          (v) => v.accountAddress in existingByAccount
        )

        yield* Effect.log('Vote split', {
          firstTime: firstTimeVotes.length,
          revotes: revotingVotes.length
        })

        // Step 4: Snapshot balances for first-time voters only
        // Revotes reuse stored votePower (balance anchored to entity start date)
        const firstTimeBalances = yield* Effect.gen(function* () {
          if (A.isEmptyReadonlyArray(firstTimeVotes)) return {}

          const snapshotStateVersion = yield* ledgerState({
            at_ledger_state: { timestamp: new Date(payload.start) }
          }).pipe(Effect.map((r) => StateVersion.make(r.state_version)))

          yield* Effect.log('Snapshot state version resolved', {
            snapshotStateVersion,
            snapshotDate: new Date(payload.start).toISOString()
          })

          const addresses = pipe(
            firstTimeVotes,
            A.map((v) => v.accountAddress),
            A.dedupe
          )
          const result = yield* snapshot({
            addresses,
            stateVersion: snapshotStateVersion
          })
          return R.map(result, (balances) =>
            pipe(
              R.values(balances),
              A.reduce(new BigNumber(0), (sum, v) => sum.plus(v))
            )
          )
        })

        yield* Effect.log('Snapshotted balances', {
          voterCount: R.size(firstTimeBalances)
        })

        // Step 5: Build vote power lookup, aggregate, and commit
        const getVotePower = (accountAddress: string): BigNumber => {
          const existing = existingByAccount[accountAddress]
          if (existing) return new BigNumber(existing[0].votePower)
          return (
            (firstTimeBalances as Record<string, BigNumber>)[accountAddress] ??
            new BigNumber(0)
          )
        }

        // Fan out into individual vote entries
        const allFannedOut = dedupedVotes.flatMap((v) =>
          v.votes.map((vote) => ({
            accountAddress: v.accountAddress,
            vote,
            votePower: getVotePower(v.accountAddress)
          }))
        )

        // Aggregate new power per vote option
        const newPower = pipe(
          allFannedOut,
          A.groupBy((v) => v.vote),
          R.map((votes) =>
            pipe(
              votes,
              A.reduce(new BigNumber(0), (sum, v) => sum.plus(v.votePower))
            )
          )
        )

        // Build revote removals (old vote rows to subtract)
        const revoteRemovals = revotingVotes.map((v) => ({
          accountAddress: v.accountAddress,
          oldVotes: (existingByAccount[v.accountAddress] ?? []).map((old) => ({
            vote: old.vote,
            votePower: old.votePower
          }))
        }))

        // Atomically: subtract old revote power, insert new data, advance cursor
        yield* repo.commitVoteResults({
          stateId,
          type: payload.type,
          entityId: payload.entityId,
          lastVoteCount: payload.voteCount,
          results: R.toEntries(newPower).map(([vote, votePower]) => ({
            vote,
            votePower: votePower.toFixed()
          })),
          accountVotes: allFannedOut.map((v) => ({
            accountAddress: v.accountAddress,
            vote: v.vote,
            votePower: v.votePower.toFixed()
          })),
          revoteRemovals
        })

        // Return current totals
        const { results: totals } = yield* repo.getResultsByEntity(
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
