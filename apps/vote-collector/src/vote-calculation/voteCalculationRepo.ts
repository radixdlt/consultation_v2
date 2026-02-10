import { SqlClient } from '@effect/sql/SqlClient'
import {
  voteCalculationAccountVotes,
  voteCalculationResults,
  voteCalculationState
} from 'db/src/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { Array as A, Effect, Option, pipe } from 'effect'
import { ORM } from '../db/orm'

export type AccountVoteRecord = {
  readonly accountAddress: string
  readonly vote: string
  readonly votePower: string
}

export class VoteCalculationRepo extends Effect.Service<VoteCalculationRepo>()(
  'VoteCalculationRepo',
  {
    effect: Effect.gen(function* () {
      const db = yield* ORM
      const sqlClient = yield* SqlClient

      const getOrCreateStateId = (
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
          .returning({ id: voteCalculationState.id })
          .pipe(
            Effect.flatMap((rows) =>
              pipe(
                rows,
                A.head,
                Option.map((r) => r.id),
                Option.match({
                  onNone: () =>
                    Effect.die(
                      'Expected id when upserting vote calculation state'
                    ),
                  onSome: (id) => Effect.succeed(id)
                })
              )
            ),
            Effect.orDie
          )

      const getLastVoteCount = (type: string, entityId: number) =>
        db
          .select({ lastVoteCount: voteCalculationState.lastVoteCount })
          .from(voteCalculationState)
          .where(
            and(
              eq(voteCalculationState.type, type),
              eq(voteCalculationState.entityId, entityId)
            )
          )
          .pipe(
            Effect.map((rows) =>
              pipe(
                rows,
                A.head,
                Option.map((r) => r.lastVoteCount),
                Option.getOrElse(() => 0)
              )
            ),
            Effect.orDie
          )

      const upsertVotePower = (params: {
        stateId: number
        vote: string
        votePower: string
      }) =>
        db
          .insert(voteCalculationResults)
          .values({
            stateId: params.stateId,
            vote: params.vote,
            votePower: params.votePower
          })
          .onConflictDoUpdate({
            target: [
              voteCalculationResults.stateId,
              voteCalculationResults.vote
            ],
            set: {
              votePower: sql`${voteCalculationResults.votePower} + ${params.votePower}`
            }
          })
          .pipe(Effect.asVoid, Effect.orDie)

      const upsertAccountVote = (params: AccountVoteRecord & {
        stateId: number
      }) =>
        db
          .insert(voteCalculationAccountVotes)
          .values({
            stateId: params.stateId,
            accountAddress: params.accountAddress,
            vote: params.vote,
            votePower: params.votePower
          })
          .onConflictDoUpdate({
            target: [
              voteCalculationAccountVotes.stateId,
              voteCalculationAccountVotes.accountAddress,
              voteCalculationAccountVotes.vote
            ],
            set: {
              votePower: params.votePower
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
          .from(voteCalculationResults)
          .innerJoin(
            voteCalculationState,
            eq(voteCalculationResults.stateId, voteCalculationState.id)
          )
          .where(
            and(
              eq(voteCalculationState.type, type),
              eq(voteCalculationState.entityId, entityId)
            )
          )
          .pipe(Effect.orDie)

      const commitVoteResults = (params: {
        stateId: number
        type: string
        entityId: number
        lastVoteCount: number
        results: ReadonlyArray<{ vote: string; votePower: string }>
        accountVotes: ReadonlyArray<AccountVoteRecord>
      }) =>
        // TODO: consider batch INSERT ... ON CONFLICT if vote batches grow large
        sqlClient.withTransaction(
          Effect.forEach(
            params.accountVotes,
            ({ accountAddress, vote, votePower }) =>
              upsertAccountVote({
                stateId: params.stateId,
                accountAddress,
                vote,
                votePower
              })
          ).pipe(
            Effect.andThen(
              Effect.forEach(params.results, ({ vote, votePower }) =>
                upsertVotePower({ stateId: params.stateId, vote, votePower })
              )
            ),
            Effect.andThen(
              updateLastVoteCount(
                params.type,
                params.entityId,
                params.lastVoteCount
              )
            ),
            Effect.asVoid
          )
        )

      // TODO: expose limit/offset through the RPC layer in a future version
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
          .pipe(Effect.orDie)

      return {
        getOrCreateStateId,
        getLastVoteCount,
        commitVoteResults,
        getResultsByEntity,
        getAccountVotesByEntity
      } as const
    })
  }
) {}
