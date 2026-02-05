# Vote Calculation Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build durable vote calculation workflow using Upstash Workflow with idempotency based on vote count.

**Architecture:** External idempotency check before workflow trigger (DB check prevents duplicates since QStash doesn't support workflow-level idempotency). Workflow fetches votes from GovernanceComponent, snapshots balances via Snapshot service, stores results in PostgreSQL.

**Tech Stack:** Upstash Workflow (`@upstash/workflow/tanstack`), Drizzle ORM (PostgreSQL), Effect services, TanStack Start API routes.

---

## Task 1: Add Upstash Workflow Dependency

**Files:**
- Modify: `apps/consultation/package.json`

**Step 1: Add @upstash/workflow to dependencies**

```bash
cd apps/consultation && pnpm add @upstash/workflow
```

**Step 2: Verify installation**

Run: `pnpm ls @upstash/workflow`
Expected: Shows @upstash/workflow version

**Step 3: Commit**

```bash
git add apps/consultation/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: add @upstash/workflow dependency

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Define Database Schema

**Files:**
- Create: `packages/database/src/schema.ts`

**Step 1: Write the schema**

```typescript
import { relations } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  varchar
} from 'drizzle-orm/pg-core'

// Enums
export const voteCalculationStatusEnum = pgEnum('vote_calculation_status', [
  'pending',
  'running',
  'completed',
  'failed'
])

// Tables
export const voteCalculations = pgTable('vote_calculations', {
  id: serial('id').primaryKey(),
  idempotentKey: varchar('idempotent_key', { length: 255 }).notNull().unique(),
  status: voteCalculationStatusEnum('status').notNull().default('pending')
})

export const voteCalculationResults = pgTable(
  'vote_calculation_results',
  {
    entityId: integer('entity_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    vote: varchar('vote', { length: 255 }).notNull(),
    votePower: bigint('vote_power', { mode: 'number' }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.type, table.entityId, table.vote] })
  ]
)

// No relations - tables are independent

// Types
export type VoteCalculation = typeof voteCalculations.$inferSelect
export type NewVoteCalculation = typeof voteCalculations.$inferInsert
export type VoteCalculationResult = typeof voteCalculationResults.$inferSelect
export type NewVoteCalculationResult = typeof voteCalculationResults.$inferInsert
```

**Step 2: Commit**

```bash
git add packages/database/src/schema.ts
git commit -m "$(cat <<'EOF'
feat(db): add vote calculation schema

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Generate and Run Migration

**Files:**
- Generated: `packages/database/drizzle/*.sql`

**Step 1: Generate migration**

Run: `cd packages/database && pnpm db:generate`
Expected: Creates SQL migration file in `drizzle/` directory

**Step 2: Review generated SQL**

Run: `cat packages/database/drizzle/$(ls -t packages/database/drizzle/*.sql | head -1)`
Expected: CREATE TABLE statements for vote_calculations and vote_calculation_results

**Step 3: Run migration**

Run: `cd packages/database && pnpm db:migrate`
Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add packages/database/drizzle/
git commit -m "$(cat <<'EOF'
chore(db): add vote calculation migration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create ORM Service for Consultation App

**Files:**
- Create: `apps/consultation/src/routes/api/vote-calculation/db/pgClient.ts`
- Create: `apps/consultation/src/routes/api/vote-calculation/db/orm.ts`
- Create: `apps/consultation/src/routes/api/vote-calculation/db/layer.ts`

**Step 1: Create pgClient**

```typescript
// apps/consultation/src/routes/api/vote-calculation/db/pgClient.ts
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer } from 'effect'

export const PgClientLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    return PgClient.layer({
      url: yield* Config.redacted('DATABASE_URL')
    })
  })
)
```

**Step 2: Create ORM service**

```typescript
// apps/consultation/src/routes/api/vote-calculation/db/orm.ts
import * as Pg from '@effect/sql-drizzle/Pg'
import * as DbSchema from 'db/src/schema'
import { Effect } from 'effect'
import { PgClientLive } from './pgClient'

export class ORM extends Effect.Service<ORM>()('ORM', {
  dependencies: [PgClientLive],
  effect: Pg.make({ schema: DbSchema })
}) {}
```

**Step 3: Create layer**

```typescript
// apps/consultation/src/routes/api/vote-calculation/db/layer.ts
import { Layer } from 'effect'
import { ORM } from './orm'

export const EnvLayer = ORM.Default
```

**Step 4: Commit**

```bash
git add apps/consultation/src/routes/api/vote-calculation/db/
git commit -m "$(cat <<'EOF'
feat(api): add ORM service for vote calculation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create Vote Calculation Types

**Files:**
- Create: `apps/consultation/src/routes/api/vote-calculation/types.ts`

**Step 1: Create types file**

```typescript
// apps/consultation/src/routes/api/vote-calculation/types.ts
import { Schema } from 'effect'

export const VoteCalculationType = Schema.Literal('temperature_check', 'proposal')
export type VoteCalculationType = typeof VoteCalculationType.Type

export const TriggerVoteCalculationInput = Schema.Struct({
  type: VoteCalculationType,
  id: Schema.Number.pipe(Schema.int(), Schema.positive())
})
export type TriggerVoteCalculationInput = typeof TriggerVoteCalculationInput.Type

export const WorkflowPayload = Schema.Struct({
  calculationId: Schema.Number,
  keyValueStoreAddress: Schema.String,
  entityId: Schema.Number,
  type: Schema.Literal('temperature_check', 'proposal')
})
export type WorkflowPayload = typeof WorkflowPayload.Type

export const TriggerResponse = Schema.Struct({
  calculationId: Schema.Number,
  status: Schema.Literal('created', 'existing')
})
export type TriggerResponse = typeof TriggerResponse.Type
```

**Step 2: Commit**

```bash
git add apps/consultation/src/routes/api/vote-calculation/types.ts
git commit -m "$(cat <<'EOF'
feat(api): add vote calculation types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create Trigger Endpoint (POST /api/vote-calculation)

**Files:**
- Create: `apps/consultation/src/routes/api/vote-calculation/index.tsx`

**Step 1: Create trigger endpoint**

```typescript
// apps/consultation/src/routes/api/vote-calculation/index.tsx
import { Client } from '@upstash/workflow'
import { createFileRoute } from '@tanstack/react-router'
import { Effect, Schema } from 'effect'
import * as DbSchema from 'db/src/schema'
import { TriggerVoteCalculationInput, type TriggerResponse } from './types'
import { ORM } from './db/orm'
import { EnvLayer } from './db/layer'

export const Route = createFileRoute('/api/vote-calculation/')({
  server: {
    handlers: {
      POST: async (ctx) => {
        try {
          const body = await ctx.request.json()
          const input = Schema.decodeUnknownSync(TriggerVoteCalculationInput)(body)

          const program = Effect.gen(function* () {
            const orm = yield* ORM

            // 1. Get KVS address and vote count (TODO: from GovernanceComponent)
            const keyValueStoreAddress = 'placeholder'
            const voteCount = 0

            // 2. Generate idempotency key
            const idempotentKey = `${input.type}-${input.id}-votes-${voteCount}`

            // 3. Check if calculation already exists
            const existing = yield* orm((db) =>
              db.query.voteCalculations.findFirst({
                where: (t, { eq }) => eq(t.idempotentKey, idempotentKey)
              })
            )

            if (existing) {
              return { calculationId: existing.id, status: 'existing' as const }
            }

            // 4. Insert new calculation record
            const [calculation] = yield* orm((db) =>
              db
                .insert(DbSchema.voteCalculations)
                .values({ idempotentKey, status: 'pending' })
                .returning()
            )

            // 5. Trigger workflow
            const client = new Client({ token: process.env.QSTASH_TOKEN! })
            const baseUrl = process.env.APP_URL || 'http://localhost:3000'

            yield* Effect.tryPromise(() =>
              client.trigger({
                url: `${baseUrl}/api/vote-calculation/workflow`,
                body: {
                  calculationId: calculation.id,
                  keyValueStoreAddress,
                  entityId: input.id,
                  type: input.type
                }
              })
            )

            return { calculationId: calculation.id, status: 'created' as const }
          }).pipe(Effect.provide(EnvLayer))

          const result = await Effect.runPromise(program)
          return Response.json(result satisfies TriggerResponse)

        } catch (error) {
          console.error('Vote calculation trigger error:', error)
          return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
```

**Step 2: Commit**

```bash
git add apps/consultation/src/routes/api/vote-calculation/index.tsx
git commit -m "$(cat <<'EOF'
feat(api): add vote calculation trigger endpoint

POST /api/vote-calculation
- Idempotency via DB check before workflow trigger
- Returns existing calculation if duplicate

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create Workflow Endpoint (POST /api/vote-calculation/workflow)

**Files:**
- Create: `apps/consultation/src/routes/api/vote-calculation/workflow.tsx`

**Step 1: Create workflow endpoint**

```typescript
// apps/consultation/src/routes/api/vote-calculation/workflow.tsx
import { serve } from '@upstash/workflow/tanstack'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { Schema } from 'effect'
import { createDb, voteCalculations, voteCalculationResults } from 'db/src'
import { WorkflowPayload } from './types'

export const Route = createFileRoute('/api/vote-calculation/workflow')({
  server: {
    handlers: serve<WorkflowPayload>(
      async (context) => {
        const payload = Schema.decodeUnknownSync(WorkflowPayload)(context.requestPayload)
        const db = createDb(process.env.DATABASE_URL!)

        // Step 1: Mark as running
        await context.run('mark-running', async () => {
          await db
            .update(voteCalculations)
            .set({ status: 'running' })
            .where(eq(voteCalculations.id, payload.calculationId))
        })

        // Step 2: Get current state version from Radix Gateway
        const stateVersion = await context.run('get-state-version', async () => {
          // TODO: Use GetLedgerStateService
          // For now, placeholder
          const response = await fetch(
            'https://stokenet.radixdlt.com/state/ledger-state',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            }
          )
          const data = await response.json()
          return data.ledger_state.state_version as number
        })

        // Step 3: Fetch votes from GovernanceComponent
        const votes = await context.run('fetch-votes', async () => {
          // TODO: Use GovernanceComponent.getTemperatureChecksVotes or proposal equivalent
          // For now, placeholder structure
          return [] as Array<{
            accountAddress: string
            vote: 'For' | 'Against'
          }>
        })

        // Step 4: Snapshot balances for all voters
        const balances = await context.run('snapshot-balances', async () => {
          // TODO: Use Snapshot service
          // For now, placeholder
          const addresses = votes.map((v) => v.accountAddress)
          return {} as Record<string, Record<string, string>>
        })

        // Step 5: Aggregate and store results
        await context.run('store-results', async () => {
          // Aggregate voting power by vote option
          const aggregated = new Map<string, bigint>()
          for (const vote of votes) {
            const power = balances[vote.accountAddress] || BigInt(0)
            const current = aggregated.get(vote.vote) || BigInt(0)
            aggregated.set(vote.vote, current + power)
          }

          // Insert aggregated results
          if (aggregated.size > 0) {
            const results = Array.from(aggregated.entries()).map(([vote, votePower]) => ({
              type: payload.type,
              entityId: payload.entityId,
              vote,
              votePower: Number(votePower)
            }))

            await db.insert(voteCalculationResults).values(results)
          }

          // Mark completed
          await db
            .update(voteCalculations)
            .set({ status: 'completed' })
            .where(eq(voteCalculations.id, payload.calculationId))
        })
      },
      {
        failureFunction: async ({ context, failResponse }) => {
          const payload = context.requestPayload as WorkflowPayload
          const db = createDb(process.env.DATABASE_URL!)

          await db
            .update(voteCalculations)
            .set({ status: 'failed' })
            .where(eq(voteCalculations.id, payload.calculationId))

          console.error('Workflow failed:', payload.calculationId, failResponse)
        }
      }
    )
  }
})
```

**Step 2: Commit**

```bash
git add apps/consultation/src/routes/api/vote-calculation/workflow.tsx
git commit -m "$(cat <<'EOF'
feat(api): add vote calculation workflow endpoint

Workflow steps:
1. mark-running - Update DB status
2. get-state-version - Call Radix Gateway
3. fetch-votes - Query GovernanceComponent
4. snapshot-balances - Get voter balances
5. store-results - Insert results, mark completed

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Create Results Endpoint (GET /api/vote-calculation/$type/$entityId)

**Files:**
- Create: `apps/consultation/src/routes/api/vote-calculation/$type/$entityId.tsx`

**Step 1: Create results endpoint**

```typescript
// apps/consultation/src/routes/api/vote-calculation/$type/$entityId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { Effect } from 'effect'
import * as DbSchema from 'db/src/schema'
import { ORM } from '../db/orm'
import { EnvLayer } from '../db/layer'

export const Route = createFileRoute('/api/vote-calculation/$type/$entityId')({
  server: {
    handlers: {
      GET: async (ctx) => {
        try {
          const { type, entityId } = ctx.params
          const id = Number(entityId)

          if (!['temperature_check', 'proposal'].includes(type)) {
            return Response.json({ error: 'Invalid type' }, { status: 400 })
          }

          if (Number.isNaN(id) || id <= 0) {
            return Response.json({ error: 'Invalid entity ID' }, { status: 400 })
          }

          const program = Effect.gen(function* () {
            const orm = yield* ORM

            const results = yield* orm((db) =>
              db
                .select()
                .from(DbSchema.voteCalculationResults)
                .where(
                  and(
                    eq(DbSchema.voteCalculationResults.type, type),
                    eq(DbSchema.voteCalculationResults.entityId, id)
                  )
                )
            )

            return results.map((r) => ({
              vote: r.vote,
              votePower: r.votePower
            }))
          }).pipe(Effect.provide(EnvLayer))

          const results = await Effect.runPromise(program)
          return Response.json({ type, entityId: id, results })

        } catch (error) {
          console.error('Vote calculation get error:', error)
          return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
```

**Step 2: Commit**

```bash
git add apps/consultation/src/routes/api/vote-calculation/\$type/\$entityId.tsx
git commit -m "$(cat <<'EOF'
feat(api): add vote calculation results endpoint

GET /api/vote-calculation/:type/:entityId

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Integrate GovernanceComponent Service

**Files:**
- Modify: `apps/consultation/src/routes/api/vote-calculation/index.tsx`
- Modify: `apps/consultation/src/routes/api/vote-calculation/workflow.tsx`

**Step 1: Update trigger endpoint with GovernanceComponent**

Replace placeholder functions in `index.tsx`:

```typescript
// Add imports at top
import { NodeRuntime } from '@effect/platform-node'
import { GetLedgerStateService } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { Effect, Layer } from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { KeyValueStoreAddress } from 'shared/schemas'

const EnvLayer = Layer.mergeAll(
  GovernanceComponent.Default,
  GetLedgerStateService.Default
).pipe(
  Layer.provide(StokenetGatewayApiClientLayer),
  Layer.provide(Config.StokenetLive)
)

const getKeyValueStoreAddress = async (
  type: 'temperature_check' | 'proposal',
  entityId: number
): Promise<string> => {
  const program = Effect.gen(function* () {
    const governance = yield* GovernanceComponent

    if (type === 'temperature_check') {
      const tc = yield* governance.getTemperatureCheckById(entityId as any)
      return tc.votes
    } else {
      // TODO: Add getProposalById method
      throw new Error('Proposal type not yet implemented')
    }
  }).pipe(Effect.provide(EnvLayer))

  return Effect.runPromise(program)
}

const getVoteCount = async (keyValueStoreAddress: string): Promise<number> => {
  const program = Effect.gen(function* () {
    const governance = yield* GovernanceComponent
    const ledgerState = yield* GetLedgerStateService

    const stateVersion = yield* ledgerState({
      at_ledger_state: { timestamp: new Date() }
    }).pipe(Effect.map((r) => StateVersion.make(r.state_version)))

    const votes = yield* governance.getTemperatureChecksVotes({
      stateVersion,
      keyValueStoreAddress: KeyValueStoreAddress.make(keyValueStoreAddress)
    })

    return votes.length
  }).pipe(Effect.provide(EnvLayer))

  return Effect.runPromise(program)
}
```

**Step 2: Update workflow with proper service integration**

The workflow runs in Upstash context (not Effect context), so we need to use Effect.runPromise for each step. Update `workflow.tsx`:

```typescript
// Add to imports
import { NodeRuntime } from '@effect/platform-node'
import { GetLedgerStateService } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { Effect, Layer } from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { Snapshot } from 'shared/snapshot/snapshot'
import { KeyValueStoreAddress } from 'shared/schemas'

const EnvLayer = Layer.mergeAll(
  GovernanceComponent.Default,
  Snapshot.Default,
  GetLedgerStateService.Default
).pipe(
  Layer.provide(StokenetGatewayApiClientLayer),
  Layer.provide(Config.StokenetLive)
)

// Replace step implementations:

// Step 2: Get state version
const stateVersion = await context.run('get-state-version', async () => {
  const program = Effect.gen(function* () {
    const ledgerState = yield* GetLedgerStateService
    const result = yield* ledgerState({
      at_ledger_state: { timestamp: new Date() }
    })
    return result.state_version
  }).pipe(Effect.provide(EnvLayer))

  return Effect.runPromise(program)
})

// Step 3: Fetch votes
const votes = await context.run('fetch-votes', async () => {
  const program = Effect.gen(function* () {
    const governance = yield* GovernanceComponent
    const sv = StateVersion.make(stateVersion)

    const tcVotes = yield* governance.getTemperatureChecksVotes({
      stateVersion: sv,
      keyValueStoreAddress: KeyValueStoreAddress.make(payload.keyValueStoreAddress)
    })

    return tcVotes.map((v) => ({
      accountAddress: v.voter,
      vote: v.vote.variant as 'For' | 'Against'
    }))
  }).pipe(Effect.provide(EnvLayer))

  return Effect.runPromise(program)
})

// Step 4: Snapshot balances
const balances = await context.run('snapshot-balances', async () => {
  const program = Effect.gen(function* () {
    const snapshot = yield* Snapshot
    const sv = StateVersion.make(stateVersion)
    const addresses = votes.map((v) => v.accountAddress as any)

    const result = yield* snapshot({
      addresses,
      stateVersion: sv
    })

    // Convert Amount to string for storage
    return Object.fromEntries(
      Object.entries(result).map(([addr, balances]) => [
        addr,
        Object.fromEntries(
          Object.entries(balances).map(([k, v]) => [k, String(v)])
        )
      ])
    ) as Record<string, Record<string, string>>
  }).pipe(Effect.provide(EnvLayer))

  return Effect.runPromise(program)
})
```

**Step 3: Commit**

```bash
git add apps/consultation/src/routes/api/vote-calculation/index.tsx apps/consultation/src/routes/api/vote-calculation/workflow.tsx
git commit -m "$(cat <<'EOF'
feat(api): integrate GovernanceComponent and Snapshot services

- Trigger endpoint queries TC for KVS address and vote count
- Workflow fetches votes via GovernanceComponent
- Workflow snapshots balances via Snapshot service

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Add Environment Variables

**Files:**
- Modify: `apps/consultation/.env.example` (create if doesn't exist)

**Step 1: Create/update env example**

```bash
# apps/consultation/.env.example
DATABASE_URL=postgresql://user:password@localhost:5432/consultation
QSTASH_TOKEN=your-qstash-token
QSTASH_URL=http://localhost:8080  # Local dev only, omit in production
APP_URL=http://localhost:3000
```

**Step 2: Commit**

```bash
git add apps/consultation/.env.example
git commit -m "$(cat <<'EOF'
docs: add environment variables for vote calculation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Test Locally

**No files to create - manual testing steps**

**Step 1: Start QStash CLI in terminal 1**

Run: `npx @upstash/qstash-cli dev`
Expected: QStash dev server running on port 8080

**Step 2: Start app in terminal 2**

Run: `cd apps/consultation && pnpm dev`
Expected: App running on port 3000

**Step 3: Test trigger endpoint**

```bash
curl -X POST http://localhost:3000/api/vote-calculation \
  -H "Content-Type: application/json" \
  -d '{"type": "temperature_check", "id": 1}'
```

Expected: JSON response with calculationId and status

**Step 4: Poll for results**

```bash
curl http://localhost:3000/api/vote-calculation/1
```

Expected: Calculation with status progressing from pending -> running -> completed

---

## Unresolved Questions

1. **Proposal votes** - GovernanceComponent only has TC vote methods. Need `getProposalById` and `getProposalVotes` methods.

2. **Database location** - Schema is in `packages/database`, but db client needs `DATABASE_URL`. Should there be a shared db service in `packages/shared`?

3. **Concurrency limits** - Snapshot service uses `GET_ACCOUNT_BALANCES_CONCURRENCY` env var. Should workflow have similar throttling?
