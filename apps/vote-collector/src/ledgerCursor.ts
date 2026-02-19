import { GatewayApiClient } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { config } from 'db/src/schema'
import { eq } from 'drizzle-orm'
import { Array as A, Config, Effect, Option } from 'effect'
import { ORM } from './db/orm'

const CURSOR_KEY = 'ledger_state_version'
const LAST_OVERRIDE_KEY = 'ledger_state_version:last_override'

export class LedgerCursor extends Effect.Service<LedgerCursor>()(
  'LedgerCursor',
  {
    effect: Effect.gen(function* () {
      const db = yield* ORM
      const gateway = yield* GatewayApiClient
      const overrideSv = yield* Config.option(
        Config.number('LEDGER_STATE_VERSION')
      )

      const upsertConfig = (key: string, value: string) =>
        db
          .insert(config)
          .values({ key, value })
          .onConflictDoUpdate({ target: config.key, set: { value } })
          .pipe(Effect.asVoid, Effect.orDie)

      const readConfig = (key: string) =>
        db
          .select({ value: config.value })
          .from(config)
          .where(eq(config.key, key))
          .pipe(
            Effect.map(A.head),
            Effect.map(Option.map((r) => r.value)),
            Effect.orDie
          )

      const applyOverride = (sv: number) =>
        Effect.gen(function* () {
          const lastOverride = yield* readConfig(LAST_OVERRIDE_KEY)

          if (
            Option.isSome(lastOverride) &&
            Number(lastOverride.value) === sv
          ) {
            return Option.none()
          }

          yield* upsertConfig(CURSOR_KEY, String(sv))
          yield* upsertConfig(LAST_OVERRIDE_KEY, String(sv))
          yield* Effect.log('LEDGER_STATE_VERSION override applied', {
            stateVersion: sv
          })

          return Option.some(StateVersion.make(sv))
        })

      const getOrBootstrap = () =>
        Effect.gen(function* () {
          if (Option.isSome(overrideSv)) {
            const overrideResult = yield* applyOverride(overrideSv.value)
            if (Option.isSome(overrideResult)) return overrideResult.value
          }

          const existing = yield* readConfig(CURSOR_KEY)

          if (Option.isSome(existing))
            return StateVersion.make(Number(existing.value))

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
