import { Cause, Effect, PubSub, Queue } from 'effect'
import { VoteUpdatePubSub } from '../sse/voteUpdatePubSub'
import { VoteCalculation } from '../vote-calculation/voteCalculation'
import { VoteCalculationQueue } from './voteCalculationQueue'
import { VoteCalculationRepo } from './voteCalculationRepo'

export class VoteCalculationWorker extends Effect.Service<VoteCalculationWorker>()(
  'VoteCalculationWorker',
  {
    dependencies: [VoteCalculation.Default, VoteCalculationRepo.Default],
    effect: Effect.gen(function* () {
      const calculateVotes = yield* VoteCalculation
      const { takeSnapshot, notify, upsert } = yield* VoteCalculationQueue
      const pubsub = yield* VoteUpdatePubSub
      const repo = yield* VoteCalculationRepo

      return Effect.fnUntraced(function* () {
        yield* Effect.log('Consumer loop started')

        return yield* Effect.forever(
          Effect.gen(function* () {
            // Block until at least one notification arrives
            yield* Queue.take(notify)
            // Drain any additional notifications that accumulated (coalesce burst)
            yield* Queue.takeAll(notify)

            const payloads = yield* takeSnapshot

            yield* Effect.log('Processing snapshot', { count: payloads.length })

            // 1. Mark all as calculating
            yield* repo.ensureAndMarkCalculating(payloads)
            yield* Effect.forEach(
              payloads,
              (p) =>
                PubSub.publish(pubsub, {
                  type: p.type,
                  entityId: p.entityId,
                  isCalculating: true
                }),
              { discard: true }
            )

            // 2. Calculate (no isCalculating DB calls)
            const results = yield* Effect.forEach(
              payloads,
              (payload) =>
                calculateVotes(payload).pipe(
                  Effect.tap((result) =>
                    Effect.log('Vote calculation complete', {
                      type: payload.type,
                      entityId: payload.entityId,
                      results: result.results
                    })
                  ),
                  Effect.as(payload),
                  Effect.catchAllCause((cause) =>
                    Effect.log('Vote calculation failed', {
                      type: payload.type,
                      entityId: payload.entityId,
                      cause: Cause.pretty(cause)
                    }).pipe(Effect.as(null))
                  )
                )
            )

            // 3. Clear only succeeded calculations
            const succeeded = results.filter(
              (r): r is NonNullable<typeof r> => r !== null
            )
            if (succeeded.length > 0) {
              yield* repo.clearCalculatingBulk(succeeded)
              yield* Effect.forEach(
                succeeded,
                (p) =>
                  PubSub.publish(pubsub, {
                    type: p.type,
                    entityId: p.entityId,
                    isCalculating: false
                  }),
                { discard: true }
              )
            }

            // 4. Re-queue failed payloads for retry on next iteration
            const failed = payloads.filter((p) => !succeeded.includes(p))
            if (failed.length > 0) {
              yield* Effect.log('Re-queuing failed calculations', {
                count: failed.length
              })
              yield* Effect.forEach(failed, (p) => upsert(p), { discard: true })
            }
          })
        )
      })
    })
  }
) {}
