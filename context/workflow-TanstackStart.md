# Upstash Workflow Integration

## Overview

Upstash Workflow provides **durable execution** for long-running, multi-step processes. Each step (`context.run()`) is persisted—if your server restarts mid-workflow, execution resumes from the last completed step rather than restarting from scratch.

**Source**: `.repos/workflow-js/examples/tanstack-start/`

---

## Core Concepts

### `context.run(stepName, fn)` — Durable Steps

Each `run()` creates a checkpoint. The function executes **exactly once**, and its return value is persisted:

```typescript
const result = await context.run('fetch-user', async () => {
  return await db.users.findOne(userId)
})

// If server crashes here, restart resumes with `result` already available
await context.run('send-email', async () => {
  await sendEmail(result.email, 'Welcome!')
})
```

**Key behaviors**:
- Steps execute sequentially
- Return values are serialized and stored
- Failed steps retry automatically (configurable)
- Idempotent: re-running a completed step returns cached result

### `context.requestPayload` — Typed Input

Access the workflow's initial input with full type safety:

```typescript
serve<{ userId: string; action: 'activate' | 'deactivate' }>(async (context) => {
  const { userId, action } = context.requestPayload
  // ...
})
```

---

## Pattern 1: `serve` (Single Workflow)

The simplest pattern—one workflow per endpoint:

```typescript
import { serve } from '@upstash/workflow/tanstack'

export const Route = createFileRoute('/api/workflow')({
  server: {
    handlers: serve<string>(async (context) => {
      const input = context.requestPayload

      const result = await context.run('step1', () => {
        return `processed '${input}'`
      })

      await context.run('step2', () => {
        console.log('step 2 received:', result)
      })
    }),
  },
})
```

**Key points**:
- Import from `@upstash/workflow/tanstack` for TanStack Start
- Generic type `serve<T>` defines `requestPayload` type
- Route file becomes the workflow endpoint

---

## Pattern 2: `serveMany` + `createWorkflow`

Host multiple workflows under a single dynamic route with workflow-to-workflow invocation:

### Define Workflows with `createWorkflow()`

```typescript
import { createWorkflow, serveMany } from '@upstash/workflow/nextjs'
import type { WorkflowContext } from '@upstash/workflow'

const processOrder = createWorkflow(async (context: WorkflowContext<Order>) => {
  const order = context.requestPayload

  await context.run('validate', () => validateOrder(order))

  // Invoke another workflow and wait for its result
  const { body, isFailed } = await context.invoke('charge-payment', {
    workflow: chargePayment,
    body: { amount: order.total, customerId: order.customerId },
  })

  if (isFailed) {
    await context.run('handle-failure', () => refundOrder(order.id))
    return
  }

  await context.run('fulfill', () => shipOrder(order.id))
})

const chargePayment = createWorkflow(
  async (context: WorkflowContext<{ amount: number; customerId: string }>) => {
    const { amount, customerId } = context.requestPayload

    const result = await context.run('charge', async () => {
      return await stripe.charges.create({ amount, customer: customerId })
    })

    return { chargeId: result.id }
  },
  { retries: 2 }  // Configuration options
)
```

### `context.invoke()` — Workflow Composition

Call another workflow and await its completion:

```typescript
const { body, isCanceled, isFailed } = await context.invoke('step-name', {
  workflow: targetWorkflow,
  body: payloadForTarget,
})
```

**Return values**:
- `body`: Return value from the invoked workflow
- `isFailed`: `true` if workflow threw or exhausted retries
- `isCanceled`: `true` if workflow was manually canceled

### Expose with `serveMany()`

```typescript
const { POST: serveManyHandler } = serveMany({
  processOrder,
  chargePayment,
})

export const Route = createFileRoute('/api/workflows/$workflowName')({
  server: {
    handlers: {
      POST: async (ctx) => serveManyHandler(ctx.request),
    },
  },
})
```

**Routing**: Dynamic `$workflowName` param selects workflow:
- `POST /api/workflows/processOrder` → runs `processOrder`
- `POST /api/workflows/chargePayment` → runs `chargePayment`

---

## `WorkflowContext<T>` Type

Full typing for workflow context:

```typescript
import type { WorkflowContext } from '@upstash/workflow'

const myWorkflow = createWorkflow(async (context: WorkflowContext<MyPayload>) => {
  context.requestPayload  // typed as MyPayload
  context.run(...)        // durable step
  context.invoke(...)     // call another workflow
  context.sleep(...)      // durable delay
  context.sleepUntil(...) // sleep until timestamp
})
```

---

## Configuration Options

Pass options as second argument to `createWorkflow()`:

```typescript
const myWorkflow = createWorkflow(
  async (context) => { /* ... */ },
  {
    retries: 3,           // Max retry attempts per step (default: 3)
    // Additional options vary by adapter
  }
)
```

---

## Development Setup

### 1. QStash CLI (Local Development)

Upstash Workflow uses QStash for durable message delivery. Run locally:

```bash
npx @upstash/qstash-cli dev
```

### 2. Environment Variables

```bash
# .env
QSTASH_URL="http://localhost:8080"  # Local dev only
QSTASH_TOKEN="your-token"           # Required in all environments
```

> **Production**: Only `QSTASH_TOKEN` needed—`QSTASH_URL` defaults to Upstash cloud.

### 3. Run App

```bash
npm run dev  # Default: port 3001
```

---

## Testing

### Single Workflow

```bash
curl -X POST http://localhost:3001/api/workflow \
  -H "Content-Type: application/json" \
  -d '"your input string"'
```

### Multi-Workflow (`serveMany`)

```bash
# Trigger processOrder (which invokes chargePayment)
curl -X POST http://localhost:3001/api/workflows/processOrder \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "total": 5000, "customerId": "cust_abc"}'

# Trigger chargePayment directly
curl -X POST http://localhost:3001/api/workflows/chargePayment \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "customerId": "cust_abc"}'
```

---

## Adapter Note

| Framework | Import Path |
|-----------|-------------|
| TanStack Start | `@upstash/workflow/tanstack` |
| Next.js | `@upstash/workflow/nextjs` |

For `serveMany`, the Next.js adapter works with TanStack Start.
