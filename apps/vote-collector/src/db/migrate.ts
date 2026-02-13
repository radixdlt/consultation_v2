import { FileSystem, Path } from '@effect/platform'
import { NodeContext } from '@effect/platform-node'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Config, Effect } from 'effect'
import pg from 'pg'

export class DatabaseMigrations extends Effect.Service<DatabaseMigrations>()(
  'DatabaseMigrations',
  {
    dependencies: [NodeContext.layer],
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const connectionString = yield* Config.string('DATABASE_URL')
      const ssl = yield* Config.boolean('DATABASE_SSL').pipe(
        Config.withDefault(false)
      )

      const resolveMigrationsFolder = Effect.gen(function* () {
        const candidates = [
          'packages/database/drizzle',
          '../../packages/database/drizzle'
        ]
        for (const candidate of candidates) {
          const abs = path.resolve(candidate)
          if (yield* fs.exists(abs)) return abs
        }
        return yield* Effect.die(
          new Error(
            `Migrations folder not found (tried: ${candidates.join(', ')})`
          )
        )
      })

      return Effect.fnUntraced(function* () {
        const migrationsFolder = yield* resolveMigrationsFolder
        yield* Effect.log(`Running migrations from ${migrationsFolder}`)
        yield* Effect.acquireUseRelease(
          Effect.sync(() => new pg.Pool({ connectionString, ssl })),
          (pool) =>
            Effect.promise(() => migrate(drizzle(pool), { migrationsFolder })),
          (pool) =>
            Effect.gen(function* () {
              yield* Effect.log('Closing database connection pool')
              return yield* Effect.promise(() => pool.end())
            })
        )
        yield* Effect.log('Migrations complete')
      })
    })
  }
) {}
