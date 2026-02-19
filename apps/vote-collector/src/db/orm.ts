import * as Pg from '@effect/sql-drizzle/Pg'
import * as DbSchema from 'db/src/schema'
import { Effect } from 'effect'

export class ORM extends Effect.Service<ORM>()('ORM', {
  effect: Pg.make({ schema: DbSchema })
}) {}
