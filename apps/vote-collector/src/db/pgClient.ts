import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer } from 'effect'

export const PgClientLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    return PgClient.layer({
      url: yield* Config.redacted('DATABASE_URL')
    })
  })
)
