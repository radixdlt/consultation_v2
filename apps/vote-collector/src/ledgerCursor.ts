import { GatewayApiClient } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { config } from 'db/src/schema'
import { eq } from 'drizzle-orm'
import { Array as A, Effect, Option, pipe } from 'effect'
import { ORM } from './db/orm'

const CURSOR_KEY = 'ledger_state_version'

export class LedgerCursor extends Effect.Service<LedgerCursor>()(
  'LedgerCursor',
  {
    effect: Effect.gen(function* () {
      const db = yield* ORM
      const gateway = yield* GatewayApiClient

      const getOrBootstrap = () =>
        Effect.gen(function* () {
          const rows = yield* db
            .select({ value: config.value })
            .from(config)
            .where(eq(config.key, CURSOR_KEY))
            .pipe(Effect.orDie)

          const existing = pipe(
            rows,
            A.head,
            Option.map((r) => StateVersion.make(Number(r.value)))
          )

          if (Option.isSome(existing)) return existing.value

          const current = yield* gateway.status
            .getCurrent()
            .pipe(Effect.catchAll(Effect.die))
          const sv = StateVersion.make(current.ledger_state.state_version)

          yield* db
            .insert(config)
            .values({ key: CURSOR_KEY, value: String(sv) })
            .onConflictDoNothing()
            .pipe(Effect.orDie)

          yield* Effect.log('LedgerCursor bootstrapped', {
            stateVersion: sv
          })

          return sv
        })

      const advance = (newSv: StateVersion) =>
        db
          .update(config)
          .set({ value: String(newSv) })
          .where(eq(config.key, CURSOR_KEY))
          .pipe(Effect.asVoid, Effect.orDie)

      return { getOrBootstrap, advance } as const
    })
  }
) {}
