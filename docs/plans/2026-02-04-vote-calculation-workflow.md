# Plan: Upstash Workflow Vote Calculation

## Overview
Durable vote calculation workflow using Upstash Workflow. Idempotent based on vote count.

## Trigger Flow
```
POST /api/vote-calculation { type: 'temperature_check' | 'proposal', id }
    → Query GovernanceComponent for entity + vote count
    → Generate key: "{type}-{id}-votes-{count}"
    → DB check: exists? → return existing (noop)
    → Insert row + trigger workflow
```

**Idempotency pattern** (from context/workflow.md#workflow-level-idempotency):
- QStash Workflow does NOT support workflow-level idempotency
- Use "Option 1: External check before trigger" - DB check prevents duplicate workflow creation

**Two vote types** (from scrypto/src/governance.rs):
- `temperature_check` - TC votes before elevation
- `proposal` - elevated proposal votes (GP - Governance Proposal)

## Database Tables
**File:** `packages/database/src/schema.ts`

**voteCalculations:**
- id, idempotentKey (unique), type (enum: 'temperature_check' | 'proposal')
- entityId (TC ID or Proposal ID), keyValueStoreAddress
- voteCount, stateVersion, status (enum), workflowRunId, createdAt, completedAt

**voteCalculationResults:**
- id, calculationId (FK), accountAddress, vote, balances (jsonb), totalVotingPower

## API Routes
**Directory:** `apps/consultation/src/routes/api/vote-calculation/`

| File | Method | Purpose |
|------|--------|---------|
| `index.tsx` | POST | Trigger - idempotency check, calls `Client.trigger()` |
| `workflow.tsx` | POST | `serve()` from `@upstash/workflow/tanstack` |
| `$id.tsx` | GET | Return calculation + results |

## Workflow Steps
1. `mark-running` - Update DB status
2. `get-state-version` - Call Radix Gateway
3. `fetch-votes` - GovernanceComponent (TC or Proposal based on type)
4. `snapshot-balances` - Snapshot service
5. `store-results` - Insert results, mark completed

## Implementation Sequence
1. `pnpm add @upstash/workflow` in apps/consultation
2. Add tables to packages/database/src/schema.ts
3. `pnpm db:generate && pnpm db:migrate`
4. Create index.tsx (trigger)
5. Create workflow.tsx (workflow)
6. Create $id.tsx (results)

## Key Patterns
- Import from `@upstash/workflow/tanstack`
- `createFileRoute` with `server.handlers`
- Don't catch WorkflowAbort (it's control flow)
- Workflow must be deterministic

## Environment Variables
- QSTASH_TOKEN, DATABASE_URL, APP_URL
- Local dev: QSTASH_URL=http://localhost:8080

## Local Dev
```
npx @upstash/qstash-cli dev  # Terminal 1
pnpm dev                      # Terminal 2
```

## Reference Files
- `scrypto/src/governance.rs` - TC vs Proposal vote types
- `apps/vote-collector/src/index.ts` - calculation flow
- `packages/shared/src/governance/governanceComponent.ts`
- `packages/shared/src/snapshot/snapshot.ts`
- `context/workflow-TanstackStart.md` - TanStack Start patterns
- `context/workflow.md#workflow-level-idempotency` - idempotency workaround
