import { Cause, Effect, PubSub, Queue } from 'effect'
import { VoteUpdatePubSub } from '../sse/voteUpdatePubSub'
import { VoteCalculation } from '../vote-calculation/voteCalculation'
import { VoteCalculationQueue } from './voteCalculationQueue'

export class VoteCalculationWorker extends Effect.Service<VoteCalculationWorker>()(
  'VoteCalculationWorker',
  {
    dependencies: [VoteCalculation.Default],
    effect: Effect.gen(function* () {
      const calculateVotes = yield* VoteCalculation
      const { takeSnapshot, notify } = yield* VoteCalculationQueue
      const pubsub = yield* VoteUpdatePubSub

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

            yield* Effect.forEach(
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
                  Effect.tap(() =>
                    PubSub.publish(pubsub, {
                      type: payload.type,
                      entityId: payload.entityId
                    })
                  ),
                  Effect.catchAllCause((cause) =>
                    Effect.log('Vote calculation failed', {
                      type: payload.type,
                      entityId: payload.entityId,
                      cause: Cause.pretty(cause)
                    })
                  )
                ),
              { discard: true }
            )
          })
        )
      })
    })
  }
) {}
