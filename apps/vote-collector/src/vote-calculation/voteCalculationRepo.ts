import { voteCalculationResults, voteCalculationState } from 'db/src/schema'
import { and, eq, sql } from 'drizzle-orm'
import { Array as A, Effect, Option, pipe } from 'effect'
import { ORM } from '../db/orm'

export class VoteCalculationRepo extends Effect.Service<VoteCalculationRepo>()(
  'VoteCalculationRepo',
  {
    effect: Effect.gen(function* () {
      const db = yield* ORM

      const getOrCreateStateId = (type: string, entityId: number) =>
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

      return {
        getOrCreateStateId,
        getLastVoteCount,
        upsertVotePower,
        updateLastVoteCount,
        getResultsByEntity
      } as const
    })
  }
) {}
