import { GetLedgerStateService } from '@radix-effects/gateway'
import { type AccountAddress, StateVersion } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import {
  Array as A,
  Effect,
  flow,
  Option,
  pipe,
  Record as R,
  Schedule
} from 'effect'
import { GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'
import type { VoteCalculationPayload } from './types'
import { VoteCalculationRepo } from './voteCalculationRepo'

type DedupedVote = { accountAddress: AccountAddress; votes: string[] }

const flattenVotes = (
  dedupedVotes: ReadonlyArray<DedupedVote>,
  existingByAccount: Record<
    AccountAddress,
    ReadonlyArray<{ vote: string; votePower: string }>
  >,
  firstTimeBalances: Record<AccountAddress, BigNumber>
) => {
  const getVotePower = (accountAddress: AccountAddress): BigNumber =>
    pipe(
      R.get(existingByAccount, accountAddress),
      Option.flatMap(A.head),
      Option.map((v) => new BigNumber(v.votePower)),
      Option.orElse(() => R.get(firstTimeBalances, accountAddress)),
      Option.getOrElse(() => new BigNumber(0))
    )

  return pipe(
    dedupedVotes,
    A.flatMap((v) =>
      pipe(
        v.votes,
        A.map((vote) => ({
          accountAddress: v.accountAddress,
          vote,
          votePower: getVotePower(v.accountAddress)
        }))
      )
    )
  )
}

const aggregateVoteResults = (
  flattened: ReadonlyArray<{ vote: string; votePower: BigNumber }>
) =>
  pipe(
    flattened,
    A.groupBy((v) => v.vote),
    R.map(A.reduce(new BigNumber(0), (sum, v) => sum.plus(v.votePower))),
    R.toEntries,
    A.map(([vote, votePower]) => ({
      vote,
      votePower: votePower.toFixed()
    }))
  )

const buildRevoteRemovals = (
  revotingVotes: ReadonlyArray<DedupedVote>,
  existingByAccount: Record<
    string,
    ReadonlyArray<{ vote: string; votePower: string }>
  >
) =>
  pipe(
    revotingVotes,
    A.map((v) => ({
      accountAddress: v.accountAddress,
      oldVotes: pipe(
        R.get(existingByAccount, v.accountAddress),
        Option.getOrElse(
          (): ReadonlyArray<{ vote: string; votePower: string }> => []
        ),
        A.map((old) => ({ vote: old.vote, votePower: old.votePower }))
      )
    }))
  )

const buildVoteEntries = (
  dedupedVotes: ReadonlyArray<DedupedVote>,
  existingByAccount: Record<
    AccountAddress,
    ReadonlyArray<{ vote: string; votePower: string }>
  >,
  firstTimeBalances: Record<AccountAddress, BigNumber>,
  revotingVotes: ReadonlyArray<DedupedVote>
) => {
  const flattened = flattenVotes(
    dedupedVotes,
    existingByAccount,
    firstTimeBalances
  )

  return {
    voteResults: aggregateVoteResults(flattened),
    accountVotes: pipe(
      flattened,
      A.map((v) => ({
        accountAddress: v.accountAddress,
        vote: v.vote,
        votePower: v.votePower.toFixed()
      }))
    ),
    revoteRemovals: buildRevoteRemovals(revotingVotes, existingByAccount)
  }
}

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

      const fetchDedupedVotes = (
        payload: typeof VoteCalculationPayload.Type,
        lastVoteCount: number
      ) => {
        const params = {
          keyValueStoreAddress: payload.keyValueStoreAddress,
          fromIndexInclusive: lastVoteCount,
          toIndexInclusive: payload.voteCount
        }

        if (payload.type === 'temperature_check') {
          return governance.getTemperatureCheckVotesByIndex(params).pipe(
            Effect.map(
              flow(
                A.reverse,
                A.dedupeWith((a, b) => a.accountAddress === b.accountAddress),
                A.map(
                  (v): DedupedVote => ({
                    accountAddress: v.accountAddress,
                    votes: [v.vote]
                  })
                )
              )
            )
          )
        }
        return governance.getProposalVotesByIndex(params).pipe(
          Effect.map(
            flow(
              A.reverse,
              A.dedupeWith((a, b) => a.accountAddress === b.accountAddress),
              A.map(
                (v): DedupedVote => ({
                  accountAddress: v.accountAddress,
                  votes: v.options.map(String)
                })
              )
            )
          )
        )
      }

      const classifyVotes = (
        stateId: number,
        dedupedVotes: ReadonlyArray<DedupedVote>
      ) =>
        Effect.gen(function* () {
          const existingAccountVotes = yield* repo.getAccountVotesByAddresses(
            stateId,
            dedupedVotes.map((v) => v.accountAddress)
          )

          const existingByAccount = pipe(
            existingAccountVotes,
            A.groupBy((v) => v.accountAddress)
          )

          const [firstTimeVotes, revotingVotes] = A.partition(
            dedupedVotes,
            (v) => v.accountAddress in existingByAccount
          )

          yield* Effect.log('Vote split', {
            firstTime: firstTimeVotes.length,
            revotes: revotingVotes.length
          })

          return { firstTimeVotes, revotingVotes, existingByAccount }
        })

      const snapshotFirstTimeBalances = (
        firstTimeVotes: ReadonlyArray<DedupedVote>,
        startDate: number
      ) =>
        Effect.gen(function* () {
          if (A.isEmptyReadonlyArray(firstTimeVotes)) return {}

          const snapshotStateVersion = yield* ledgerState({
            at_ledger_state: { timestamp: new Date(startDate) }
          }).pipe(
            Effect.map((r) => StateVersion.make(r.state_version)),
            Effect.orDie
          )

          yield* Effect.log('Snapshot state version resolved', {
            snapshotStateVersion,
            snapshotDate: new Date(startDate).toISOString()
          })

          const addresses = pipe(
            firstTimeVotes,
            A.map((v) => v.accountAddress),
            A.dedupe
          )
          const result = yield* snapshot({
            addresses,
            stateVersion: snapshotStateVersion
          }).pipe(
            Effect.retry(
              Schedule.exponential('1 second').pipe(
                Schedule.intersect(Schedule.recurs(3))
              )
            ),
            Effect.orDie
          )

          return R.map(result, (balances) =>
            pipe(
              R.values(balances),
              A.reduce(new BigNumber(0), (sum, v) => sum.plus(v))
            )
          )
        })

      return Effect.fn('@vote-collector/VoteCalculation')(function* (
        payload: typeof VoteCalculationPayload.Type
      ) {
        yield* Effect.log('Starting vote calculation', {
          type: payload.type,
          entityId: payload.entityId,
          voteCount: payload.voteCount
        })

        const { id: stateId, lastVoteCount } = yield* repo.getOrCreateState(
          payload.type,
          payload.entityId
        )

        yield* Effect.log('Last vote count', { lastVoteCount })

        if (payload.voteCount <= lastVoteCount) {
          yield* Effect.log('No new votes, short-circuiting')
          return {
            type: payload.type,
            entityId: payload.entityId
          }
        }

        yield* Effect.log('New votes detected', {
          newVoteCount: payload.voteCount - lastVoteCount
        })

        const dedupedVotes = yield* fetchDedupedVotes(payload, lastVoteCount)

        yield* Effect.log('Fetched and deduped votes', {
          count: dedupedVotes.length
        })

        const { firstTimeVotes, revotingVotes, existingByAccount } =
          yield* classifyVotes(stateId, dedupedVotes)

        const firstTimeBalances = yield* snapshotFirstTimeBalances(
          firstTimeVotes,
          payload.start
        )

        yield* Effect.log('Snapshotted balances', {
          voterCount: R.size(firstTimeBalances)
        })

        const { voteResults, accountVotes, revoteRemovals } = buildVoteEntries(
          dedupedVotes,
          existingByAccount,
          firstTimeBalances,
          revotingVotes
        )

        yield* repo.commitVoteResults({
          stateId,
          type: payload.type,
          entityId: payload.entityId,
          lastVoteCount: payload.voteCount,
          results: voteResults,
          accountVotes,
          revoteRemovals
        })

        return {
          type: payload.type,
          entityId: payload.entityId
        }
      })
    })
  }
) {}
