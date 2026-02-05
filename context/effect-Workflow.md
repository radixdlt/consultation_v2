# @effect/workflow — Durable Workflows for Effect

## Overview

`@effect/workflow` provides **durable, resumable, fault-tolerant workflows** built on Effect. A workflow is a long-running computation that can survive process restarts, pause for hours/days without consuming resources, and resume from where it left off.

Key properties:
- **Idempotent** — execution IDs are deterministic SHA-256 hashes of `name + idempotencyKey(payload)`; re-executing with the same payload returns the same execution
- **Durable** — activities execute at-most-once and cache results; durable clock/deferred survive restarts
- **Suspendable** — workflows self-suspend via fiber self-interruption (`fiber.unsafeInterruptAsFork(fiber.id())`)
- **Schema-driven** — all payload/success/error boundaries use `Schema` for serializable persistence
- **Composable** — workflows can nest other workflows, with parent-child interrupt propagation

**Source:** `.repos/effect/packages/workflow/src/`
**Peer deps:** `effect`, `@effect/experimental`, `@effect/platform`, `@effect/rpc`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Workflow](#workflow)
3. [Activity](#activity)
4. [DurableClock](#durableclock)
5. [DurableDeferred](#durabledeferred)
6. [DurableQueue](#durablequeue)
7. [DurableRateLimiter](#durableratelimiter)
8. [WorkflowEngine](#workflowengine)
9. [WorkflowProxy & WorkflowProxyServer](#workflowproxy--workflowproxyserver)
10. [Execution Lifecycle](#execution-lifecycle)
11. [Patterns](#patterns)
12. [Testing](#testing)
13. [Common Mistakes](#common-mistakes)
14. [Quick Reference](#quick-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Code                                │
│  Workflow.make(...)  → .toLayer(execute)  → .execute(payload)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  WorkflowEngine │   Context.Tag service
                    │    (abstract)   │   ← plug in any backend
                    └──┬──────────┬───┘
                       │          │
          ┌────────────▼──┐  ┌───▼──────────────┐
          │ layerMemory   │  │ ClusterWorkflow   │  (from @effect/cluster)
          │ (in-memory)   │  │ Engine.layer      │  (Postgres-backed)
          └───────────────┘  └───────────────────┘
                       │
         ┌─────────────┼─────────────────┐
         ▼             ▼                 ▼
    Activity     DurableClock      DurableDeferred
   (at-most-once) (pause/resume)  (external signal)
         │
         ▼
    DurableQueue / DurableRateLimiter
```

### Module Dependency Graph

```
Workflow ──────┐
Activity ──────┤
DurableClock ──┤──► WorkflowEngine (provides runtime)
DurableDeferred┤
DurableQueue ──┘
     │
     ▼
WorkflowProxy ──► WorkflowProxyServer (HTTP/RPC exposure)
```

---

## Workflow

The core unit. Defines a named, schema-typed, idempotent computation.

### Type Signature

```typescript
interface Workflow<
  Name extends string,            // unique name, used in execution ID hash
  Payload extends AnyStructSchema, // Schema.Struct for input
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
> {
  readonly name: Name
  readonly payloadSchema: Payload
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly annotations: Context.Context<never>

  // Methods
  execute(payload, options?): Effect<Success | string, Error, WorkflowEngine>
  poll(executionId): Effect<Result<Success, Error> | undefined>
  interrupt(executionId): Effect<void>
  resume(executionId): Effect<void>
  toLayer(execute): Layer<never, never, WorkflowEngine | R>
  executionId(payload): Effect<string>
  withCompensation(compensation): (effect) => Effect
  annotate(tag, value): Workflow
  annotateContext(context): Workflow
}
```

### Constructor: `Workflow.make`

```typescript
const MyWorkflow = Workflow.make({
  name: "MyWorkflow",                          // unique identifier
  payload: { id: Schema.String },              // Schema.Struct fields or AnyStructSchema
  idempotencyKey: ({ id }) => id,              // deterministic key from payload
  success: Schema.String,                      // optional, defaults to Schema.Void
  error: MyError,                              // optional, defaults to Schema.Never
  suspendedRetrySchedule: Schedule.spaced(5000), // optional retry on suspend
  annotations: Context.empty()                 // optional
})
```

**Execution ID derivation:**
```
executionId = SHA-256("MyWorkflow-" + idempotencyKey(payload)).slice(0, 16).toHex()
```
This means the same `(name, idempotencyKey)` pair always produces the same execution ID — guaranteeing idempotency.

### `execute` — Run or Resume

```typescript
// Normal execution — blocks until complete
const result = yield* MyWorkflow.execute({ id: "abc" })

// Discard mode — returns executionId immediately, runs in background
const execId = yield* MyWorkflow.execute({ id: "abc" }, { discard: true })
```

When `discard: false` (default), the engine:
1. Computes deterministic executionId
2. Registers execution (or finds existing)
3. Runs/resumes the workflow fiber
4. If result is `Suspended`, retries with `suspendedRetrySchedule` (default: exponential 200ms → 30s cap)
5. Returns `Complete.exit` when done

### `toLayer` — Register Implementation

```typescript
const MyWorkflowLayer = MyWorkflow.toLayer(
  Effect.fn(function*(payload, executionId) {
    // workflow body — has access to:
    // - WorkflowEngine, WorkflowInstance (auto-provided)
    // - Workflow scope (closed only on full completion)
    yield* Activity.make({ name: "Step1", execute: doWork(payload) })
    yield* DurableClock.sleep({ name: "wait", duration: "1 hour" })
  })
)
```

### `fromTaggedRequest` — Schema.TaggedRequest Shortcut

```typescript
class CreateUser extends Schema.TaggedRequest<CreateUser>()("CreateUser", {
  payload: { name: Schema.String },
  success: Schema.Struct({ id: Schema.String }),
  failure: Schema.Never
}) {}

const CreateUserWorkflow = Workflow.fromTaggedRequest(CreateUser)
// name = "CreateUser", idempotencyKey = PrimaryKey.value
```

### Result Types

```typescript
type Result<A, E> = Complete<A, E> | Suspended

class Complete<A, E> extends Data.TaggedClass("Complete")<{
  readonly exit: Exit<A, E>
}>

class Suspended extends Schema.TaggedClass("Suspended")<{
  cause: Schema.optional(Schema.Cause<never>)
}>
```

### Annotations

```typescript
// Capture defects in results (default: true)
class CaptureDefects extends Context.Reference<CaptureDefects>()(...) {
  defaultValue: () => true
}

// Suspend on ANY error instead of completing with failure (default: false)
class SuspendOnFailure extends Context.Reference<SuspendOnFailure>()(...) {
  defaultValue: () => false
}

// Usage:
const MyWorkflow = Workflow.make({ ... })
  .annotate(Workflow.SuspendOnFailure, true)
```

### Compensation

Registers cleanup logic that runs if the **entire workflow** fails:

```typescript
yield* Activity.make({ name: "Reserve", execute: reserveItem(id) }).pipe(
  MyWorkflow.withCompensation((reservationId, failureCause) =>
    cancelReservation(reservationId)
  )
)
```

**Important:** Compensation finalizers are registered on the workflow scope and only fire for top-level effects, NOT nested activities.

### Scope

```typescript
// Access the workflow scope (lives for entire execution, not just current run)
const workflowScope = yield* Workflow.scope

// Extend an effect's lifetime to the workflow scope
yield* Workflow.provideScope(someEffect)

// Register a finalizer on the workflow scope
yield* Workflow.addFinalizer((exit) => cleanup(exit))
```

---

## Activity

An atomic, **at-most-once** unit of work within a workflow. The engine caches activity results keyed by `executionId/activityName/attempt`.

### Type Signature

```typescript
interface Activity<
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never,
  R = never
> extends Effect<Success["Type"], Error["Type"],
    Success["Context"] | Error["Context"] | R | WorkflowEngine | WorkflowInstance> {
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly exitSchema: Schema.Schema<Exit<Success, Error>>
  readonly execute: Effect<...>         // raw execution
  readonly executeEncoded: Effect<...>  // encoded for persistence
}
```

Activities extend `Effect` — you can `yield*` them directly.

### Constructor

```typescript
const SendEmail = Activity.make({
  name: "SendEmail",                    // unique within workflow
  success: Schema.Void,                // optional
  error: SendEmailError,               // optional
  execute: Effect.gen(function*() {
    const attempt = yield* Activity.CurrentAttempt  // 1-based
    yield* sendEmailApi(payload)
  }),
  interruptRetryPolicy: Schedule.recurs(5)  // optional, retries on fiber interrupt
})
```

### Default Interrupt Retry Policy

Activities automatically retry when interrupted (e.g., during workflow suspension):
```
exponential(100ms, factor=1.5) ∪ spaced(10s) ∪ recurs(10)
  → whileInput(Cause.isInterrupted)
```
After exhausting retries: `die("Activity X interrupted and retry attempts exhausted")`

### `Activity.retry`

```typescript
yield* SendEmail.pipe(
  Activity.retry({ times: 5 })
  // Note: `schedule` is excluded from options — retry is attempt-based only
)
```

Internally tracks `CurrentAttempt` (starts at 1, increments each retry).

### `Activity.idempotencyKey`

```typescript
// Generates a deterministic key: SHA-256(executionId + "-" + name)
const key = yield* Activity.idempotencyKey("my-api-call")

// With attempt included:
const key = yield* Activity.idempotencyKey("my-api-call", { includeAttempt: true })
// → SHA-256(executionId + "-" + attempt + "-" + name)
```

### `Activity.raceAll`

```typescript
const winner = yield* Activity.raceAll("race-name", [
  activityA,
  activityB,
  activityC
])
// Uses DurableDeferred.raceAll under the hood — first to complete wins
// Result is durably cached
```

### Activity Execution Flow (Internal)

```
Activity.commit()
  → engine.activityExecute(activity, attempt)
    → check cache by activityId = "executionId/name/attempt"
      → if cached & Complete: return cached exit
      → if cached & Suspended: clear cache, re-run
      → if not cached: run activity.executeEncoded
        → Workflow.intoResult (captures exit)
        → cache result
  → if Suspended: Workflow.suspend(instance) — self-interrupt fiber
  → if Complete: return exit value
```

---

## DurableClock

Pauses a workflow for a duration without consuming resources.

### `DurableClock.sleep`

```typescript
yield* DurableClock.sleep({
  name: "wait-for-approval",
  duration: "7 days",
  inMemoryThreshold: "60 seconds"  // optional, default 60s
})
```

**Behavior:**
- Duration ≤ `inMemoryThreshold` → wraps `Effect.sleep` in an Activity (in-memory, still at-most-once)
- Duration > threshold → creates a `DurableDeferred`, schedules wake-up via `engine.scheduleClock`, then suspends

```
DurableClock.sleep("7 days")
  │
  ├─ ≤ 60s? → Activity.make({ execute: Effect.sleep(duration) })
  │
  └─ > 60s? → engine.scheduleClock(workflow, { executionId, clock })
              → DurableDeferred.await(clock.deferred)  // suspends workflow
              → engine wakes up via deferredDone after duration
```

### DurableClock Model

```typescript
interface DurableClock {
  readonly name: string
  readonly duration: Duration
  readonly deferred: DurableDeferred<typeof Schema.Void>  // internal latch
}
```

---

## DurableDeferred

A **signal/latch** that allows external processes to complete a workflow step. The workflow suspends until an external caller provides a result.

### Type Signature

```typescript
interface DurableDeferred<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All = typeof Schema.Never
> {
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly exitSchema: Schema.ExitFromSelf<Success, Error, Defect>
  readonly withActivityAttempt: Effect<DurableDeferred<Success, Error>>
}
```

### Constructor

```typescript
const ApprovalSignal = DurableDeferred.make("ApprovalSignal", {
  success: Schema.Struct({ approved: Schema.Boolean }),
  error: Schema.Never
})
```

### Awaiting (Inside Workflow)

```typescript
// Suspends the workflow until the deferred is completed externally
const result = yield* DurableDeferred.await(ApprovalSignal)
```

Internally:
1. Asks engine for `deferredResult(deferred)` — checks if already completed
2. If result exists → return it
3. If `undefined` → `Workflow.suspend(instance)` — self-interrupts the fiber

### Completing (External)

Completion uses a **Token** system for cross-process addressing:

```typescript
// Inside workflow: acquire token
const token = yield* DurableDeferred.token(ApprovalSignal)
// token is a Base64URL-encoded JSON: [workflowName, executionId, deferredName]

// Outside workflow (any process with WorkflowEngine):
yield* DurableDeferred.succeed(ApprovalSignal, {
  token,
  value: { approved: true }
})

// Or with Exit:
yield* DurableDeferred.done(ApprovalSignal, { token, exit: Exit.succeed(...) })

// Or fail:
yield* DurableDeferred.fail(ApprovalSignal, { token, error: myError })
yield* DurableDeferred.failCause(ApprovalSignal, { token, cause: myCause })
```

### Token System

```typescript
type Token = Brand.Branded<string, TokenTypeId>

class TokenParsed extends Schema.Class("...")({
  workflowName: Schema.String,
  executionId: Schema.String,
  deferredName: Schema.String
}) {
  get asToken(): Token  // encodes to Base64URL JSON
  static fromString(token: Token): TokenParsed
  static FromString: Schema.Schema<TokenParsed, string>  // schema for transport
}
```

Token construction:
```typescript
// From workflow instance context:
const token = yield* DurableDeferred.token(deferred)

// From known execution ID:
const token = DurableDeferred.tokenFromExecutionId(deferred, { workflow, executionId })

// From workflow payload (computes executionId):
const token = yield* DurableDeferred.tokenFromPayload(deferred, { workflow, payload })
```

### `DurableDeferred.into` — Fork-and-Signal

```typescript
// Runs effect, then auto-completes the deferred with its exit
yield* DurableDeferred.into(someEffect, ApprovalSignal)

// Pipeable form:
yield* someEffect.pipe(DurableDeferred.into(ApprovalSignal))
```

### `DurableDeferred.raceAll` — Race with Caching

```typescript
const winner = yield* DurableDeferred.raceAll({
  name: "race",
  success: Schema.Union(SchemaA, SchemaB),
  error: Schema.Union(ErrorA, ErrorB),
  effects: [effectA, effectB]
})
// First to complete wins; result cached in deferred
// On re-execution, returns cached winner immediately
```

---

## DurableQueue

Distributed queue backed by `@effect/experimental/PersistedQueue`. Items are persisted with trace context propagation.

### Constructor

```typescript
const ApiQueue = DurableQueue.make({
  name: "ApiQueue",
  payload: { id: Schema.String, data: Schema.Unknown },
  idempotencyKey: (payload) => payload.id,
  success: Schema.Struct({ status: Schema.String }),  // optional
  error: ApiError                                      // optional
})
```

### Processing (Inside Workflow)

```typescript
// Enqueue item and suspend until worker completes it
const result = yield* DurableQueue.process(ApiQueue, { id: "req-1", data: {} })
```

Internally:
1. Creates a `PersistedQueue` by name
2. Generates idempotency key via `Activity.idempotencyKey`
3. Creates a per-item `DurableDeferred` for the result
4. Offers item to queue with `{ token, payload, traceId, spanId, sampled }`
5. Awaits the deferred → suspends workflow until worker completes

### Worker (Outside Workflow)

```typescript
// As a Layer (recommended):
const ApiWorkerLayer = DurableQueue.worker(
  ApiQueue,
  Effect.fn(function*(payload) {
    const result = yield* callExternalApi(payload.data)
    return { status: "ok" }
  }),
  { concurrency: 5 }
)

// As an Effect (for more control):
const workerEffect = DurableQueue.makeWorker(ApiQueue, handler, { concurrency: 5 })
```

Worker internals:
- Takes items from PersistedQueue
- Runs handler, captures `Exit`
- Calls `DurableDeferred.done(deferred, { token, exit })` to signal completion
- Links parent trace via `ExternalSpan`

---

## DurableRateLimiter

Wraps `@effect/experimental/RateLimiter` in an Activity with DurableClock-based delay.

```typescript
yield* DurableRateLimiter.rateLimit({
  name: "api-limit",
  algorithm: "token-bucket",    // or "fixed-window"
  window: "1 minute",
  limit: 100,
  key: "my-api",
  tokens: 1                    // optional, default 1
})
// Returns Activity<Void, RateLimitStoreError, RateLimiter>
```

When rate limit is exceeded, uses `DurableClock.sleep` for the delay — making even rate-limit waits durable.

---

## WorkflowEngine

The abstract engine service that plugs in backend storage.

### Service Definition

```typescript
class WorkflowEngine extends Context.Tag("@effect/workflow/WorkflowEngine")<
  WorkflowEngine,
  {
    register(workflow, execute): Effect<void, never, Scope | R>
    execute(workflow, options): Effect<Success | string, Error>
    poll(workflow, executionId): Effect<Result | undefined>
    interrupt(workflow, executionId): Effect<void>
    resume(workflow, executionId): Effect<void>
    activityExecute(activity, attempt): Effect<Result>
    deferredResult(deferred): Effect<Exit | undefined>
    deferredDone(deferred, options): Effect<void>
    scheduleClock(workflow, options): Effect<void>
  }
>() {}
```

### WorkflowInstance

Represents the current execution context inside a running workflow:

```typescript
class WorkflowInstance extends Context.Tag("...")<WorkflowInstance, {
  readonly executionId: string
  readonly workflow: Workflow.Any
  readonly scope: Scope.CloseableScope     // lives for entire execution
  suspended: boolean                        // mutable — set by suspend()
  interrupted: boolean                      // mutable — set by interrupt()
  cause: Cause<never> | undefined           // SuspendOnFailure cause
  readonly activityState: {
    count: number                           // active concurrent activities
    readonly latch: Effect.Latch            // synchronization for activity completion
  }
}>() {
  static initial(workflow, executionId): WorkflowInstance["Type"]
}
```

### `Encoded` Interface — Building Custom Engines

```typescript
interface Encoded {
  register(workflow, execute): Effect<void, never, Scope>
  execute(workflow, options): Effect<Result | void>
  poll(workflow, executionId): Effect<Result | undefined>
  interrupt(workflow, executionId): Effect<void>
  resume(workflow, executionId): Effect<void>
  activityExecute(activity, attempt): Effect<Result, never, WorkflowInstance>
  deferredResult(deferred): Effect<Exit | undefined, never, WorkflowInstance>
  deferredDone(options): Effect<void>
  scheduleClock(workflow, options): Effect<void>
}

const engine = WorkflowEngine.makeUnsafe(encoded)
```

### `layerMemory` — In-Memory Engine

```typescript
const testLayer = WorkflowEngine.layerMemory
// State: Map<name, {workflow, execute, scope}>    — registered workflows
//        Map<executionId, ExecutionState>          — running executions
//        Map<activityId, ActivityState>            — activity result cache
//        Map<deferredId, Exit>                     — deferred results
//        FiberMap for clock scheduling
```

### Nested Workflow Support

When a parent workflow executes a child:
1. Parent's `WorkflowInstance` is detected via `Effect.serviceOption(WorkflowInstance)`
2. Child execution is wrapped in `wrapActivityResult` — treated like an activity
3. If child suspends → parent suspends too
4. On child complete → parent is resumed via `resume(parent.executionId)`
5. Parent interrupt propagates to child via finalizer

---

## WorkflowProxy & WorkflowProxyServer

Auto-generate RPC and HTTP endpoints from workflow definitions.

### RPC (`toRpcGroup`)

```typescript
const myWorkflows = [EmailWorkflow, PaymentWorkflow] as const

class MyRpcs extends WorkflowProxy.toRpcGroup(myWorkflows, { prefix: "wf/" }) {}
// Generates per workflow:
//   Rpc<"wf/EmailWorkflow">         — execute, returns success/error
//   Rpc<"wf/EmailWorkflowDiscard">  — execute with discard, returns void
//   Rpc<"wf/EmailWorkflowResume">   — resume by executionId
```

### HTTP API (`toHttpApiGroup`)

```typescript
const workflowsApi = WorkflowProxy.toHttpApiGroup("workflows", myWorkflows)
// Generates per workflow (name converted to kebab-case):
//   POST /email-workflow           — execute
//   POST /email-workflow/discard   — execute with discard
//   POST /email-workflow/resume    — resume
```

### Server Handlers

```typescript
// HTTP:
const httpLayer = WorkflowProxyServer.layerHttpApi(MyApi, "workflows", myWorkflows)

// RPC:
const rpcLayer = WorkflowProxyServer.layerRpcHandlers(myWorkflows, { prefix: "wf/" })
```

---

## Execution Lifecycle

### Full Workflow Execution Flow

```
Workflow.execute(payload)
  │
  ├─ Compute executionId = SHA-256(name + idempotencyKey(payload))
  ├─ engine.execute(workflow, { executionId, payload })
  │   │
  │   ├─ If new: create ExecutionState, fork fiber
  │   │   │
  │   │   └─ Run execute(payload, executionId)
  │   │       │
  │   │       ├─ Activity.make → engine.activityExecute
  │   │       │   ├─ Check cache by activityId
  │   │       │   ├─ If cached Complete → return
  │   │       │   └─ If not cached → run, cache result
  │   │       │
  │   │       ├─ DurableClock.sleep → if > threshold:
  │   │       │   ├─ engine.scheduleClock (delay + deferredDone)
  │   │       │   └─ DurableDeferred.await → suspend
  │   │       │
  │   │       └─ DurableDeferred.await → check deferredResult
  │   │           ├─ If result exists → return
  │   │           └─ If undefined → Workflow.suspend(instance)
  │   │                               ↓
  │   │               instance.suspended = true
  │   │               fiber.unsafeInterruptAsFork(fiber.id())
  │   │                               ↓
  │   │               Workflow.intoResult captures as Suspended
  │   │
  │   ├─ If existing & running: join fiber
  │   └─ If result is Suspended: retry with schedule
  │
  └─ Return Complete.exit
```

### Suspend / Resume Cycle

```
Execution Running
    │
    ├─ Activity needs result not yet available
    │   OR DurableDeferred not yet completed
    │   OR DurableClock scheduled
    │
    ▼
Workflow.suspend(instance)
    │  instance.suspended = true
    │  fiber interrupts itself
    │
    ▼
Workflow.intoResult captures interrupt → Suspended { cause? }
    │
    ▼
Engine stores Suspended result
    │
    ═══════════ (time passes, process may restart) ═══════════
    │
External event triggers resume:
    │  - DurableDeferred.done/succeed/fail
    │  - DurableClock timer fires
    │  - Manual Workflow.resume(executionId)
    │
    ▼
engine.resume(executionId)
    │  Creates fresh WorkflowInstance (preserves interrupted flag)
    │  Re-forks workflow fiber from start
    │  Activities replay from cache (at-most-once)
    │  Deferreds return cached results
    │
    ▼
Execution Running (resumes past cached points)
```

---

## Patterns

### Basic Workflow with Activity + Sleep + Deferred

```typescript
const OrderWorkflow = Workflow.make({
  name: "OrderWorkflow",
  payload: { orderId: Schema.String },
  success: Schema.Struct({ status: Schema.String }),
  error: OrderError,
  idempotencyKey: ({ orderId }) => orderId
})

const OrderWorkflowLayer = OrderWorkflow.toLayer(
  Effect.fn(function*(payload, executionId) {
    // Step 1: Activity — executes at-most-once
    const reservation = yield* Activity.make({
      name: "ReserveInventory",
      success: Schema.Struct({ reservationId: Schema.String }),
      execute: reserveItem(payload.orderId)
    }).pipe(
      OrderWorkflow.withCompensation((res) =>
        cancelReservation(res.reservationId)
      )
    )

    // Step 2: Durable sleep — no resources consumed
    yield* DurableClock.sleep({ name: "payment-window", duration: "24 hours" })

    // Step 3: Wait for external payment confirmation
    const PaymentSignal = DurableDeferred.make("PaymentConfirmation", {
      success: Schema.Struct({ transactionId: Schema.String })
    })
    const payment = yield* DurableDeferred.await(PaymentSignal)

    return { status: "completed" }
  })
)
```

### Nested Workflows

```typescript
const ParentWorkflow = Workflow.make({
  name: "Parent",
  payload: { batchId: Schema.String },
  idempotencyKey: ({ batchId }) => batchId
})

const ParentLayer = ParentWorkflow.toLayer(
  Effect.fn(function*(payload) {
    // Child workflow execution — parent suspends if child suspends
    yield* ChildWorkflow.execute({ id: "child-1" })
    yield* ChildWorkflow.execute({ id: "child-2" })
  })
)
```

### SuspendOnFailure — Manual Retry

```typescript
const ManualRetryWorkflow = Workflow.make({
  name: "ManualRetry",
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => id
}).annotate(Workflow.SuspendOnFailure, true)

// On any error, workflow suspends instead of completing with failure.
// An operator can then fix the issue and call:
//   ManualRetryWorkflow.resume(executionId)
```

### DurableQueue — Distributed Processing

```typescript
const ProcessingQueue = DurableQueue.make({
  name: "ImageProcessing",
  payload: { imageUrl: Schema.String },
  idempotencyKey: (p) => p.imageUrl,
  success: Schema.Struct({ thumbnailUrl: Schema.String })
})

// Inside workflow:
const result = yield* DurableQueue.process(ProcessingQueue, { imageUrl: "..." })

// Separate worker process:
const WorkerLayer = DurableQueue.worker(
  ProcessingQueue,
  Effect.fn(function*(payload) {
    return { thumbnailUrl: yield* generateThumbnail(payload.imageUrl) }
  }),
  { concurrency: 10 }
)
```

---

## Testing

### With TestClock

```typescript
import { describe, it } from "@effect/vitest"

it.effect("workflow completes after clock advance", () =>
  Effect.gen(function*() {
    const execId = yield* MyWorkflow.execute(
      { id: "test-1" },
      { discard: true }
    )
    yield* TestClock.adjust("1 day")
    expect(yield* MyWorkflow.poll(execId))
      .toEqual(new Workflow.Complete({ exit: Exit.void }))
  }).pipe(
    Effect.provide(
      MyWorkflowLayer.pipe(
        Layer.provideMerge(WorkflowEngine.layerMemory)
      )
    )
  )
)
```

### Layer Composition for Tests

```typescript
// All workflow layers merge, then provide engine
const TestEnv = Layer.mergeAll(
  ParentWorkflowLayer,
  ChildWorkflowLayer
).pipe(
  Layer.provideMerge(WorkflowEngine.layerMemory)
)
```

---

## Common Mistakes

### 1. Non-Deterministic Idempotency Keys

```typescript
// ❌ Random UUID — every execution creates a new workflow!
Workflow.make({
  idempotencyKey: () => crypto.randomUUID()
})

// ✅ Deterministic from payload
Workflow.make({
  idempotencyKey: ({ orderId }) => orderId
})
```

### 2. Compensation on Nested Activities

```typescript
// ❌ Compensation only works at top-level
const Inner = Activity.make({ name: "Inner", execute: ... })
const Outer = Activity.make({
  name: "Outer",
  execute: Inner.pipe(MyWorkflow.withCompensation(...))  // won't fire!
})

// ✅ Use compensation at the workflow level
yield* Inner.pipe(MyWorkflow.withCompensation(...))
```

### 3. Forgetting to Register Workflow Layers

```typescript
// ❌ Workflow not registered — engine.execute will die
Effect.provide(program, WorkflowEngine.layerMemory)

// ✅ Provide workflow layer + engine
Effect.provide(program,
  MyWorkflowLayer.pipe(Layer.provideMerge(WorkflowEngine.layerMemory))
)
```

### 4. Side Effects Outside Activities

```typescript
// ❌ Raw Effect.log runs on every resume — not idempotent
yield* Effect.log("Sending email")
yield* sendEmail(payload)

// ✅ Wrap side effects in Activity for at-most-once semantics
yield* Activity.make({
  name: "SendEmail",
  execute: Effect.gen(function*() {
    yield* Effect.log("Sending email")
    yield* sendEmail(payload)
  })
})
```

### 5. DurableDeferred Name Collisions

```typescript
// ❌ Same deferred name used twice — second await returns first result
const D1 = DurableDeferred.make("signal")
const D2 = DurableDeferred.make("signal")

// ✅ Unique names per deferred
const D1 = DurableDeferred.make("approval-signal")
const D2 = DurableDeferred.make("payment-signal")
```

---

## Quick Reference

### Module Exports

| Module | Key Exports |
|--------|-------------|
| `Workflow` | `make`, `fromTaggedRequest`, `Result`, `Complete`, `Suspended`, `intoResult`, `scope`, `provideScope`, `addFinalizer`, `withCompensation`, `suspend`, `CaptureDefects`, `SuspendOnFailure` |
| `Activity` | `make`, `retry`, `CurrentAttempt`, `idempotencyKey`, `raceAll` |
| `DurableClock` | `make`, `sleep` |
| `DurableDeferred` | `make`, `await`, `into`, `raceAll`, `token`, `tokenFromExecutionId`, `tokenFromPayload`, `done`, `succeed`, `fail`, `failCause`, `Token`, `TokenParsed` |
| `DurableQueue` | `make`, `process`, `makeWorker`, `worker` |
| `DurableRateLimiter` | `rateLimit` |
| `WorkflowEngine` | `WorkflowEngine`, `WorkflowInstance`, `Encoded`, `makeUnsafe`, `layerMemory` |
| `WorkflowProxy` | `toRpcGroup`, `toHttpApiGroup` |
| `WorkflowProxyServer` | `layerHttpApi`, `layerRpcHandlers` |

### Requirement Tags

| Tag | Where Needed |
|-----|-------------|
| `WorkflowEngine` | All workflow operations |
| `WorkflowInstance` | Inside workflow execution (auto-provided by engine) |
| `Scope` | Inside `withCompensation`, `addFinalizer` (auto-provided) |
| `PersistedQueueFactory` | `DurableQueue.process`, `DurableQueue.worker` |
| `RateLimiter` | `DurableRateLimiter.rateLimit` |

### Defaults

| Setting | Default |
|---------|---------|
| Success schema | `Schema.Void` |
| Error schema | `Schema.Never` |
| `CaptureDefects` | `true` |
| `SuspendOnFailure` | `false` |
| DurableClock in-memory threshold | 60 seconds |
| Activity interrupt retry | exponential(100ms, 1.5) ∪ spaced(10s) ∪ recurs(10) |
| Suspended retry schedule | exponential(200ms, 1.5) \| spaced(30s) |
| DurableQueue retry schedule | exponential(500ms, 1.5) ∪ spaced(1min) |
| DurableQueue worker concurrency | 1 |
