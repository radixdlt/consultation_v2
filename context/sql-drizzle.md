# Effect SQL-Drizzle - Deep Analysis

## Overview

`@effect/sql-drizzle` integrates Drizzle ORM with Effect via **remote proxy adapters**, enabling:

1. **Type-safe queries** with Drizzle's query builder and schema system
2. **Effect-native execution** - Drizzle queries become yieldable Effects
3. **Unified DI** - SqlClient layer flows through to Drizzle automatically
4. **Transaction support** via Effect's `sql.withTransaction`

**When to use**: Schema-driven development, familiar Drizzle API, type-safe queries with Effect's DI and error handling.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Application                           │
├─────────────────────────────────────────────────────────────────┤
│  Effect.gen(function* () {                                      │
│    const db = yield* PgDrizzle                                  │
│    const users = yield* db.select().from(usersTable)  ◄─────┐  │
│  })                                                          │  │
└──────────────────────────────────────────────────────────────│──┘
                                                               │
┌──────────────────────────────────────────────────────────────│──┐
│  @effect/sql-drizzle                                         │  │
├──────────────────────────────────────────────────────────────│──┤
│                                                              │  │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │  │
│  │  PgDrizzle Tag      │    │  Prototype Patch            │ │  │
│  │  (Context.Tag)      │    │  QueryPromise → Effectable  │─┘  │
│  └─────────┬───────────┘    └─────────────────────────────┘    │
│            │                                                    │
│  ┌─────────▼───────────┐    ┌─────────────────────────────┐    │
│  │  make(config?)      │───►│  drizzle(remoteCallback)    │    │
│  │  (Constructor)      │    │  (pg-proxy/mysql-proxy/etc) │    │
│  └─────────────────────┘    └─────────────┬───────────────┘    │
│                                           │                     │
│  ┌────────────────────────────────────────▼───────────────┐    │
│  │  makeRemoteCallback                                    │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ (sql, params, method) => {                        │ │    │
│  │  │   const stmt = client.unsafe(sql, params)         │ │    │
│  │  │   return runPromise(stmt)                         │ │    │
│  │  │ }                                                 │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  @effect/sql (SqlClient)                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  client.unsafe(sql, params) → Effect<rows, SqlError>       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight**: Drizzle's remote proxy pattern (`pg-proxy`, `mysql-proxy`, `sqlite-proxy`) accepts a callback for query execution. Effect provides that callback via `makeRemoteCallback`, which bridges to `SqlClient`.

---

## Core Concepts

### Prototype Patching - The Magic

The library patches Drizzle's `QueryPromise.prototype` with Effect's `Effectable.CommitPrototype`:

```typescript
// internal/patch.ts
const PatchProto = {
  ...Effectable.CommitPrototype,
  commit(this: QueryPromise<unknown>) {
    return Effect.runtime().pipe(
      Effect.flatMap((context) =>
        Effect.tryPromise({
          try: () => {
            currentRuntime = context
            return this.execute()
          },
          catch: (cause) => new SqlError({ cause, message: "Failed to execute" })
        })
      )
    )
  }
}
patch(QueryPromise.prototype)
patch(PgSelectBase.prototype)  // Also patches select queries
```

This enables direct yielding:

```typescript
// No wrapping needed - Drizzle queries ARE Effects
const users = yield* db.select().from(usersTable)
```

### Context Tags

| Module | Tag | Database Type |
|--------|-----|---------------|
| `@effect/sql-drizzle/Pg` | `PgDrizzle` | `PgRemoteDatabase` |
| `@effect/sql-drizzle/Mysql` | `MysqlDrizzle` | `MySqlRemoteDatabase` |
| `@effect/sql-drizzle/Sqlite` | `SqliteDrizzle` | `SqliteRemoteDatabase` |

### Constructors

```typescript
// Without config - uses default settings
make<TSchema>()
// Effect<PgRemoteDatabase<TSchema>, never, SqlClient>

// With config - pass schema for relational queries
make({ schema: { users, posts } })
// Effect<PgRemoteDatabase<{ users, posts }>, never, SqlClient>

// Full DrizzleConfig
makeWithConfig(config)
// Effect<PgRemoteDatabase, never, SqlClient>
```

### Layers

```typescript
// Basic layer - no schema
Pg.layer
// Layer<PgDrizzle, never, SqlClient>

// With config - enables relational API
Pg.layerWithConfig({ schema: { users, posts } })
// Layer<PgDrizzle, never, SqlClient>
```

---

## Setup & Layer Composition

### Basic Setup

```typescript
import * as Pg from "@effect/sql-drizzle/Pg"
import { PgClient } from "@effect/sql-pg"
import { Layer } from "effect"

// SqlClient → Drizzle dependency chain
const DrizzleLive = Pg.layer.pipe(
  Layer.provide(PgClient.layer({
    host: "localhost",
    database: "mydb"
  }))
)

const program = Effect.gen(function* () {
  const db = yield* Pg.PgDrizzle
  return yield* db.select().from(users)
})

Effect.runPromise(program.pipe(Effect.provide(DrizzleLive)))
```

### With Schema (Relational Queries)

```typescript
import * as D from "drizzle-orm/pg-core"

const users = D.pgTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name").notNull()
})

const posts = D.pgTable("posts", {
  id: D.serial("id").primaryKey(),
  userId: D.integer("user_id").references(() => users.id),
  title: D.text("title").notNull()
})

// Schema enables db.query.users.findMany()
const DrizzleLive = Pg.layerWithConfig({
  schema: { users, posts }
}).pipe(
  Layer.provide(PgClientLive)
)
```

### Service Pattern (Recommended)

```typescript
import * as Pg from "@effect/sql-drizzle/Pg"

class ORM extends Effect.Service<ORM>()("ORM", {
  effect: Pg.make({ schema: { users, posts } })
}) {
  // Convenience: merge SqlClient dependency
  static Client = this.Default.pipe(
    Layer.provideMerge(PgClientLive)
  )
}

// Usage
const program = Effect.gen(function* () {
  const db = yield* ORM
  return yield* db.query.users.findMany()
})

program.pipe(Effect.provide(ORM.Client))
```

---

## Query Patterns

### SELECT

```typescript
const db = yield* Pg.PgDrizzle

// Select all columns
const allUsers = yield* db.select().from(users)

// Select specific columns
const names = yield* db.select({ name: users.name }).from(users)

// With conditions
import { eq, gt, and } from "drizzle-orm"
const filtered = yield* db.select().from(users).where(
  and(eq(users.active, true), gt(users.age, 18))
)
```

### INSERT

```typescript
// Single insert
yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })

// Multiple values
yield* db.insert(users).values([
  { name: "Alice", snakeCase: "alice" },
  { name: "Bob", snakeCase: "bob" }
])

// PostgreSQL: returning()
const [inserted] = yield* db.insert(users)
  .values({ name: "Alice", snakeCase: "alice" })
  .returning()

// MySQL: $returningId()
const returningId = yield* db.insert(users)
  .values({ name: "Alice", snakeCase: "alice" })
  .$returningId()
// Returns: [{ id: 1 }]
```

### UPDATE

```typescript
yield* db.update(users)
  .set({ name: "Alice Updated" })
  .where(eq(users.id, 1))

// PostgreSQL: with returning
const [updated] = yield* db.update(users)
  .set({ name: "Alice Updated" })
  .where(eq(users.id, 1))
  .returning()
```

### DELETE

```typescript
yield* db.delete(users).where(eq(users.id, 1))

// PostgreSQL: with returning
const [deleted] = yield* db.delete(users)
  .where(eq(users.id, 1))
  .returning()
```

### Relational Queries (with schema)

```typescript
const db = yield* ORM  // Service with schema configured

// findMany with column selection
const results = yield* db.query.users.findMany({
  columns: { id: true, name: true, snakeCase: false }
})

// With relations (requires schema relations setup)
const withPosts = yield* db.query.users.findMany({
  with: { posts: true }
})
```

---

## Transactions

Transactions use Effect's `sql.withTransaction`, not Drizzle's transaction API:

```typescript
const sql = yield* SqlClient.SqlClient
const db = yield* Pg.PgDrizzle

yield* sql.withTransaction(Effect.gen(function* () {
  yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })
  yield* db.insert(posts).values({ userId: 1, title: "Hello" })

  // Effect.fail() triggers rollback
  if (someCondition) {
    return yield* Effect.fail("rollback")
  }
}))
```

**Important**: Drizzle queries inside `withTransaction` automatically participate in the transaction - no special handling needed.

---

## Error Handling

All database errors are wrapped as `SqlError`:

```typescript
import { SqlError } from "@effect/sql/SqlError"

const program = Effect.gen(function* () {
  const db = yield* Pg.PgDrizzle
  return yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })
}).pipe(
  Effect.catchTag("SqlError", (error) => {
    console.error("Database error:", error.cause)
    return Effect.succeed([])
  })
)
```

### Constraint Violations

```typescript
// Unique constraint violation example
yield* db.insert(users).values({ name: "Alice", snakeCase: "test" })
const result = yield* Effect.flip(
  db.insert(users).values({ name: "Alice", snakeCase: "test" })  // Duplicate!
)
// result is SqlError with underlying DB constraint error
```

---

## Database-Specific Notes

### PostgreSQL

- Native `.returning()` for INSERT/UPDATE/DELETE
- `Layer.effect` for layer construction

```typescript
const [user] = yield* db.insert(users)
  .values({ name: "Alice", snakeCase: "alice" })
  .returning()
// user: { id: 1, name: "Alice", snakeCase: "alice" }
```

### MySQL

- Use `.$returningId()` extension (no native RETURNING)
- Returns only the ID column(s)

```typescript
const returningId = yield* db.insert(users)
  .values({ name: "Alice", snakeCase: "alice" })
  .$returningId()
// returningId: [{ id: 1 }]

// Multiple inserts
const ids = yield* db.insert(users).values([
  { name: "Alice", snakeCase: "alice" },
  { name: "Bob", snakeCase: "bob" }
]).$returningId()
// ids: [{ id: 1 }, { id: 2 }]
```

### SQLite

- `Layer.scoped` for layer construction (file-based, needs cleanup)
- Use `$returningId()` like MySQL

```typescript
// SQLite layer is scoped for resource management
Sqlite.layer  // Layer.scoped(SqliteDrizzle, make())
```

---

## Promise Interop

Drizzle queries can also be used with regular Promises (useful for migration scripts or interop):

```typescript
const db = yield* Pg.PgDrizzle

// Promise-based execution (still uses Effect runtime internally)
const results = yield* Effect.promise(() => db.select().from(users))

// Insert with promise
yield* Effect.promise(() =>
  db.insert(users).values({ name: "Alice", snakeCase: "snake" })
)
```

The `makeRemoteCallback` captures the Effect runtime at construction time and uses it for Promise-based calls.

---

## Summary

| Concept | Description |
|---------|-------------|
| **Remote Proxy** | Uses `drizzle-orm/*-proxy` adapters with Effect callback |
| **Prototype Patch** | `QueryPromise` implements `Effectable` protocol |
| **Direct Yield** | `yield* db.select()` - no wrapping needed |
| **Context Tags** | `PgDrizzle`, `MysqlDrizzle`, `SqliteDrizzle` |
| **Transactions** | Use `sql.withTransaction()`, not Drizzle's API |
| **Errors** | All errors wrapped as `SqlError` |
| **RETURNING** | PostgreSQL: `.returning()`, MySQL: `.$returningId()` |
| **Schema** | Pass to `make()` for relational query API |
