import { Array as A, Effect, HashMap, Option, Queue, Ref } from 'effect'
import type { VoteCalculationPayload } from '../vote-calculation/types'

type Payload = typeof VoteCalculationPayload.Type

type EntityKey = `${Payload['type']}-${number}`

const makeKey = (p: Payload): EntityKey => `${p.type}-${p.entityId}`

export class VoteCalculationQueue extends Effect.Service<VoteCalculationQueue>()(
  'VoteCalculationQueue',
  {
    effect: Effect.gen(function* () {
      const buffer = yield* Ref.make(HashMap.empty<EntityKey, Payload>())
      const notify = yield* Queue.unbounded<void>()

      const upsert = (payload: Payload) =>
        Ref.update(buffer, (map) => {
          const key = makeKey(payload)
          const existing = HashMap.get(map, key)
          if (
            Option.isSome(existing) &&
            existing.value.voteCount >= payload.voteCount
          )
            return map
          return HashMap.set(map, key, payload)
        }).pipe(Effect.andThen(notify.offer(void 0)))

      const takeSnapshot = Ref.getAndSet(buffer, HashMap.empty()).pipe(
        Effect.map((map) => A.fromIterable(HashMap.values(map)))
      )

      return { upsert, takeSnapshot, notify } as const
    })
  }
) {}
