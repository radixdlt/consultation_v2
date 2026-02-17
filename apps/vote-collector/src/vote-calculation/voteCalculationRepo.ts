import { AccountAddress } from '@radix-effects/shared'
import { SqlClient } from '@effect/sql/SqlClient'
import {
  voteCalculationAccountVotes,
  voteCalculationResults,
  voteCalculationState
} from 'db/src/schema'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { Array as A, Effect, Option, pipe } from 'effect'
import { ORM } from '../db/orm'
import { EntityId, EntityType } from 'shared/governance/brandedTypes'

export type AccountVoteRecord = {
  readonly accountAddress: AccountAddress
  readonly vote: string
  readonly votePower: string
}

export class VoteCalculationRepo extends Effect.Service<VoteCalculationRepo>()(
  'VoteCalculationRepo',
  {
    effect: Effect.gen(function* () {
      const db = yield* ORM
      const sqlClient = yield* SqlClient

      const getOrCreateState = (
        type: 'temperature_check' | 'proposal',
        entityId: number
      ) =>
        db
          .insert(voteCalculationState)
          .values({ type, entityId })
          .onConflictDoUpdate({
            target: [voteCalculationState.type, voteCalculationState.entityId],
            set: {
              lastVoteCount: sql`${voteCalculationState.lastVoteCount}`
            }
          })
          .returning({
            id: voteCalculationState.id,
            lastVoteCount: voteCalculationState.lastVoteCount
          })
          .pipe(
            Effect.flatMap((rows) =>
              pipe(
                rows,
                A.head,
                Option.match({
                  onNone: () =>
                    Effect.die(
                      'Expected row when upserting vote calculation state'
                    ),
                  onSome: (row) =>
                    Effect.succeed({
                      id: row.id,
                      lastVoteCount: row.lastVoteCount
                    })
                })
              )
            ),
            Effect.orDie
          )

      const getAccountVotesByAddresses = (
        stateId: number,
        accountAddresses: ReadonlyArray<string>
      ) =>
        A.isEmptyReadonlyArray(accountAddresses)
          ? Effect.succeed(
              A.empty<{
                accountAddress: AccountAddress
                vote: string
                votePower: string
              }>()
            )
          : db
              .select({
                accountAddress: voteCalculationAccountVotes.accountAddress,
                vote: voteCalculationAccountVotes.vote,
                votePower: voteCalculationAccountVotes.votePower
              })
              .from(voteCalculationAccountVotes)
              .where(
                and(
                  eq(voteCalculationAccountVotes.stateId, stateId),
                  inArray(
                    voteCalculationAccountVotes.accountAddress,
                    accountAddresses as string[]
                  )
                )
              )
              .pipe(
                Effect.map(
                  A.map((r) => ({
                    ...r,
                    accountAddress: AccountAddress.make(r.accountAddress)
                  }))
                ),
                Effect.orDie
              )

      const deleteAccountVotesByAddresses = (
        stateId: number,
        accountAddresses: ReadonlyArray<AccountAddress>
      ) =>
        A.isEmptyReadonlyArray(accountAddresses)
          ? Effect.void
          : db
              .delete(voteCalculationAccountVotes)
              .where(
                and(
                  eq(voteCalculationAccountVotes.stateId, stateId),
                  inArray(
                    voteCalculationAccountVotes.accountAddress,
                    accountAddresses
                  )
                )
              )
              .pipe(Effect.asVoid, Effect.orDie)

      /** Subtracts old vote power from aggregated results when accounts revote.
       *  Groups old votes by vote option and builds a single UPDATE with a CASE
       *  expression that sums each option's vote powers, then subtracts the
       *  per-option totals from the corresponding result rows. */
      const subtractOldVotePower = (
        stateId: number,
        oldVotes: A.NonEmptyReadonlyArray<{ vote: string; votePower: string }>
      ) => {
        const byVote = Object.entries(A.groupBy(oldVotes, ({ vote }) => vote))

        const caseExpr = sql`CASE ${sql.join(
          byVote.map(
            ([vote, items]) =>
              sql`WHEN ${voteCalculationResults.vote} = ${vote}
                  THEN ${sql.join(
                    items.map(({ votePower }) => sql`${votePower}::numeric`),
                    sql` + `
                  )}`
          ),
          sql` `
        )} END`

        return db
          .update(voteCalculationResults)
          .set({
            votePower: sql`${voteCalculationResults.votePower} - (${caseExpr})`
          })
          .where(
            and(
              eq(voteCalculationResults.stateId, stateId),
              inArray(
                voteCalculationResults.vote,
                byVote.map(([vote]) => vote)
              )
            )
          )
          .pipe(Effect.asVoid, Effect.orDie)
      }

      const upsertAccountVotes = (
        stateId: number,
        accountVotes: A.NonEmptyReadonlyArray<AccountVoteRecord>
      ) =>
        db
          .insert(voteCalculationAccountVotes)
          .values(
            accountVotes.map((v) => ({
              stateId,
              accountAddress: v.accountAddress,
              vote: v.vote,
              votePower: v.votePower
            }))
          )
          .onConflictDoUpdate({
            target: [
              voteCalculationAccountVotes.stateId,
              voteCalculationAccountVotes.accountAddress,
              voteCalculationAccountVotes.vote
            ],
            set: { votePower: sql`excluded.vote_power` }
          })
          .pipe(Effect.asVoid, Effect.orDie)

      const upsertVoteResults = (
        stateId: number,
        results: A.NonEmptyReadonlyArray<{ vote: string; votePower: string }>
      ) =>
        db
          .insert(voteCalculationResults)
          .values(
            results.map((r) => ({
              stateId,
              vote: r.vote,
              votePower: r.votePower
            }))
          )
          .onConflictDoUpdate({
            target: [
              voteCalculationResults.stateId,
              voteCalculationResults.vote
            ],
            set: {
              votePower: sql`${voteCalculationResults.votePower} + excluded.vote_power`
            }
          })
          .pipe(Effect.asVoid, Effect.orDie)

      const updateLastVoteCount = (
        type: string,
        entityId: number,
        lastVoteCount: number
      ) =>
        db
          .update(voteCalculationState)
          .set({ lastVoteCount })
          .where(
            and(
              eq(voteCalculationState.type, type),
              eq(voteCalculationState.entityId, entityId)
            )
          )
          .pipe(Effect.asVoid, Effect.orDie)

      const getResultsByEntity = (type: string, entityId: number) =>
        db
          .select({
            vote: voteCalculationResults.vote,
            votePower: voteCalculationResults.votePower
          })
          .from(voteCalculationState)
          .leftJoin(
            voteCalculationResults,
            eq(voteCalculationResults.stateId, voteCalculationState.id)
          )
          .where(
            and(
              eq(voteCalculationState.type, type),
              eq(voteCalculationState.entityId, entityId)
            )
          )
          .pipe(
            Effect.map((rows) => ({
              results: rows
                .filter(
                  (r): r is typeof r & { vote: string; votePower: string } =>
                    r.vote !== null
                )
                .map((r) => ({
                  vote: r.vote,
                  votePower: r.votePower
                }))
            })),
            Effect.orDie
          )

      const commitVoteResults = (params: {
        stateId: number
        type: EntityType
        entityId: EntityId
        lastVoteCount: number
        results: ReadonlyArray<{ vote: string; votePower: string }>
        accountVotes: ReadonlyArray<AccountVoteRecord>
        revoteRemovals: ReadonlyArray<{
          accountAddress: AccountAddress
          oldVotes: ReadonlyArray<{ vote: string; votePower: string }>
        }>
      }) =>
        sqlClient.withTransaction(
          Effect.gen(function* () {
            // Phase 1: Remove old revote data. Only deletes if there are revote removals.
            yield* deleteAccountVotesByAddresses(
              params.stateId,
              params.revoteRemovals.map((r) => r.accountAddress)
            )
            const oldVotes = params.revoteRemovals.flatMap((r) => r.oldVotes)
            if (A.isNonEmptyReadonlyArray(oldVotes)) {
              yield* subtractOldVotePower(params.stateId, oldVotes)
            }

            // Phase 2: Insert new data
            if (A.isNonEmptyReadonlyArray(params.accountVotes)) {
              yield* upsertAccountVotes(params.stateId, params.accountVotes)
            }

            if (A.isNonEmptyReadonlyArray(params.results)) {
              yield* upsertVoteResults(params.stateId, params.results)
            }
            yield* updateLastVoteCount(
              params.type,
              params.entityId,
              params.lastVoteCount
            )
          })
        )

      const getAccountVotesByEntity = (
        type: string,
        entityId: number,
        options?: { limit?: number; offset?: number }
      ) =>
        db
          .select({
            accountAddress: voteCalculationAccountVotes.accountAddress,
            vote: voteCalculationAccountVotes.vote,
            votePower: voteCalculationAccountVotes.votePower
          })
          .from(voteCalculationAccountVotes)
          .innerJoin(
            voteCalculationState,
            eq(voteCalculationAccountVotes.stateId, voteCalculationState.id)
          )
          .where(
            and(
              eq(voteCalculationState.type, type),
              eq(voteCalculationState.entityId, entityId)
            )
          )
          .orderBy(desc(voteCalculationAccountVotes.votePower))
          .limit(options?.limit ?? 500)
          .offset(options?.offset ?? 0)
          .pipe(
            Effect.map(
              A.map((r) => ({
                ...r,
                accountAddress: AccountAddress.make(r.accountAddress)
              }))
            ),
            Effect.orDie
          )

      return {
        getOrCreateState,
        commitVoteResults,
        getResultsByEntity,
        getAccountVotesByEntity,
        getAccountVotesByAddresses
      } as const
    })
  }
) {}
