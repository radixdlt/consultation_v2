import { config } from 'db/src/schema'
import { eq, lte } from 'drizzle-orm'
import { Array as A, Config, Data, DateTime, Duration, Effect } from 'effect'
import { ORM } from './db/orm'

const LOCK_KEY = 'poll_lock'

export class PollLockNotAcquired extends Data.TaggedError(
  'PollLockNotAcquired'
) {}

export class PollLock extends Effect.Service<PollLock>()('PollLock', {
  effect: Effect.gen(function* () {
    const db = yield* ORM
    const POLL_TIMEOUT_DURATION = yield* Config.duration(
      'POLL_TIMEOUT_DURATION'
    ).pipe(Config.withDefault(Duration.seconds(120)), Effect.orDie)

    const acquireLock = Effect.gen(function* () {
      const lockedAt = DateTime.unsafeNow()
      const threshold = lockedAt.pipe(
        DateTime.subtractDuration(POLL_TIMEOUT_DURATION)
      )

      const rows = yield* db
        .insert(config)
        .values({ key: LOCK_KEY, value: lockedAt.epochMillis.toString() })
        .onConflictDoUpdate({
          target: config.key,
          set: { value: lockedAt.epochMillis.toString() },
          setWhere: lte(config.value, threshold.epochMillis.toString())
        })
        .returning({ key: config.key })
        .pipe(Effect.orDie)

      if (A.isEmptyArray(rows)) {
        return yield* new PollLockNotAcquired()
      }

      yield* Effect.log('Poll lock acquired')
    })

    const releaseLock = Effect.gen(function* () {
      yield* db
        .delete(config)
        .where(eq(config.key, LOCK_KEY))
        .pipe(Effect.orDie)
      yield* Effect.log('Poll lock released')
    })

    return <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.acquireUseRelease(
        acquireLock,
        () => effect,
        () => releaseLock
      )
  })
}) {}
