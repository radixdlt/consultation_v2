# Upstash Workflow SDK - Deep Analysis

## Overview

Upstash Workflow is a **durable serverless workflow engine** built on QStash. It enables long-running, fault-tolerant workflows without managing infrastructure.

**Key Insight**: This is a **distributed state machine** where:
- No local state storage - all state lives in QStash
- Each invocation replays the workflow, returning memoized results for completed steps
- `WorkflowAbort` is **not an error** - it's the control flow mechanism signaling step completion

---

## Architecture

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW EXECUTION CYCLE                          │
└─────────────────────────────────────────────────────────────────────────────┘

    User/Client                    Workflow Endpoint                  QStash
         │                               │                              │
         │  1. Initial Request           │                              │
         │  POST /api/workflow           │                              │
         │  body: { data: ... }          │                              │
         │──────────────────────────────>│                              │
         │                               │                              │
         │                               │  2. serveBase() validates    │
         │                               │     - No protocol header     │
         │                               │     - isFirstInvocation=true │
         │                               │     - Generate workflowRunId │
         │                               │                              │
         │                               │  3. triggerFirstInvocation() │
         │                               │     Publish initial payload  │
         │                               │     to QStash                │
         │                               │─────────────────────────────>│
         │                               │                              │
         │  4. Return { workflowRunId }  │                              │
         │<──────────────────────────────│                              │
         │                               │                              │
         │                               │  5. QStash calls back        │
         │                               │     with steps + new step    │
         │                               │<─────────────────────────────│
         │                               │                              │
         │                               │  6. parseRequest()           │
         │                               │     - Decode base64 body     │
         │                               │     - Extract steps array    │
         │                               │     - Deduplicate            │
         │                               │                              │
         │                               │  7. Create WorkflowContext   │
         │                               │     with memoized steps      │
         │                               │                              │
         │                               │  8. Execute routeFunction    │
         │                               │     - Replay cached steps    │
         │                               │     - Execute new step       │
         │                               │     - throw WorkflowAbort    │
         │                               │                              │
         │                               │  9. Submit step result       │
         │                               │─────────────────────────────>│
         │                               │                              │
         │                               │  10. Return 200 OK           │
         │                               │<─────────────────────────────│
         │                               │                              │
         │                               │  ... repeat 5-10 until done  │
         │                               │                              │
         │                               │  11. Workflow completes      │
         │                               │      triggerWorkflowDelete() │
         │                               │─────────────────────────────>│

```

### QStash as Persistence Layer

QStash serves three roles:
1. **State Store** - Steps serialized as base64 in request body
2. **Scheduler** - Handles sleep/sleepUntil via delay/notBefore
3. **Coordinator** - Manages parallel execution and callbacks

---

## Core Components

| Component | File | Purpose |
|-----------|------|---------|
| `serveBase()` | `src/serve/index.ts:49-339` | Entry point - validation, routing, response generation |
| `WorkflowContext` | `src/context/context.ts:36-488` | User API - run/sleep/call/wait/notify methods |
| `AutoExecutor` | `src/context/auto-executor.ts:9-490` | Step sequencing, parallel detection, memoization |
| `BaseLazyStep` | `src/context/steps.ts:52-180` | Step abstraction with plan/result step generation |
| `Client` | `src/client/index.ts:22-347` | External workflow management (trigger/cancel/notify) |
| `MiddlewareManager` | `src/middleware/manager.ts:19-148` | Lifecycle and debug event dispatch |

---

## Step Types

The SDK supports 10 step types, each implemented as a `BaseLazyStep` subclass:

| Step Type | Class | Method | Purpose |
|-----------|-------|--------|---------|
| `Run` | `LazyFunctionStep` | `context.run()` | Execute arbitrary code |
| `SleepFor` | `LazySleepStep` | `context.sleep()` | Pause for duration |
| `SleepUntil` | `LazySleepUntilStep` | `context.sleepUntil()` | Pause until timestamp |
| `Call` | `LazyCallStep` | `context.call()` | HTTP call via QStash (no runtime cost) |
| `Wait` | `LazyWaitForEventStep` | `context.waitForEvent()` | Wait for external event |
| `Notify` | `LazyNotifyStep` | `context.notify()` | Notify waiting workflows |
| `Invoke` | `LazyInvokeStep` | `context.invoke()` | Invoke another workflow |
| `CreateWebhook` | `LazyCreateWebhookStep` | `context.createWebhook()` | Create webhook URL |
| `WaitForWebhook` | `LazyWaitForWebhookStep` | `context.waitForWebhook()` | Wait for webhook call |
| `Initial` | (internal) | - | Stores initial payload |

---

## Lazy Execution Pattern

**Critical Concept**: Steps don't execute immediately. They're "lazy" - collected and executed in batches.

```typescript
// User writes:
const result = await context.run("my-step", () => doWork());

// What happens:
// 1. LazyFunctionStep created and added to AutoExecutor
// 2. AutoExecutor defers execution (await Promise.resolve() twice)
// 3. After deferral, checks if more steps were added (parallel detection)
// 4. If single step: runSingle()
// 5. If multiple steps: runParallel()
```

### Plan Steps vs Result Steps

Each step produces two types:

```typescript
// Plan Step (stepId=0, has targetStep)
{
  stepId: 0,
  stepName: "fetch-user",
  stepType: "Run",
  concurrent: 3,      // Number of parallel steps
  targetStep: 2       // Which step this plans for
}

// Result Step (stepId>0, has out)
{
  stepId: 2,
  stepName: "fetch-user",
  stepType: "Run",
  concurrent: 3,
  out: "{\"name\":\"Alice\"}"  // JSON-stringified result
}
```

---

## Execution Flow (Critical Path)

### Step-by-Step Breakdown

**1. Request Validation** (`src/serve/index.ts:102-131`)
```typescript
// Check protocol version and first invocation
const { isFirstInvocation, workflowRunId, unknownSdk } = validateRequest(request);

// Verify QStash signature
await verifyRequest(requestPayload, signature, receiver);
```

**2. Step Parsing** (`src/workflow-parser.ts:250-326`)
```typescript
// Decode base64-encoded steps from request body
const rawSteps = JSON.parse(requestPayload) as RawStep[];
const { rawInitialPayload, steps } = processRawSteps(rawSteps);

// Deduplicate (parallel steps can cause duplicates)
const deduplicatedSteps = deduplicateSteps(steps);
```

**3. Context Creation** (`src/serve/index.ts:189-202`)
```typescript
const workflowContext = new WorkflowContext({
  qstashClient: regionalClient,
  workflowRunId,
  initialPayload: initialPayloadParser(rawInitialPayload),
  headers: recreateUserHeaders(request.headers),
  steps,  // Memoized results from previous invocations
  url: workflowUrl,
  // ...
});
```

**4. Route Function Execution** (`src/context/auto-executor.ts:138-168`)
```typescript
// In runSingle():
if (this.stepCount < this.nonPlanStepCount) {
  // Step already executed - return memoized result
  const step = this.steps[this.stepCount + this.planStepCount];
  return lazyStep.parseOut(step);
}

// New step - execute and submit to QStash
const resultStep = await submitSingleStep({ context, lazyStep, ... });
throw new WorkflowAbort(lazyStep.stepName, resultStep);
```

**5. Step Submission** (`src/qstash/submit-steps.ts:90-146`)
```typescript
// Execute step function
const resultStep = await lazyStep.getResultStep(concurrency, stepId);

// Get headers and body
const { headers } = lazyStep.getHeaders({ context, step: resultStep, ... });
const body = lazyStep.getBody({ context, step: resultStep, ... });

// Submit to QStash
await lazyStep.submitStep({ context, body, headers, ... });
```

**6. WorkflowAbort Signal**

This is NOT an error - it's the mechanism to pause execution:

```typescript
// After submitting step, throw to signal "done for now"
throw new WorkflowAbort(lazyStep.stepName, resultStep);

// Caught in triggerRouteFunction() -> returns success response
// QStash will callback with new step result -> cycle repeats
```

---

## Parallel Execution

### Detection via Promise.all

```typescript
// User writes:
const [user, posts] = await Promise.all([
  context.run("fetch-user", () => fetchUser(id)),
  context.run("fetch-posts", () => fetchPosts(id)),
]);

// AutoExecutor detects:
// 1. First context.run() adds LazyFunctionStep to list
// 2. Defers execution (await Promise.resolve() x2)
// 3. Second context.run() adds to same list
// 4. Defers again
// 5. No more steps added -> getExecutionPromise()
// 6. lazyStepList.length > 1 -> runParallel()
```

### Parallel Call States

The SDK tracks parallel execution state (`src/context/auto-executor.ts:352-377`):

| State | Condition | Action |
|-------|-----------|--------|
| `first` | No remaining steps after initialStepCount | Submit all plan steps to QStash |
| `partial` | Last step is a plan step (has targetStep) | Execute the targeted step, submit result |
| `discard` | Last step is result step, but not all done | Ignore - other parallel steps still running |
| `last` | Have 2× parallelStepCount results | All done - return all results |

### Parallel Flow Diagram

```
                    Promise.all([step1, step2, step3])
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              LazyStep1     LazyStep2     LazyStep3
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                    AutoExecutor detects parallel
                                  │
                    ┌─────────────┴─────────────┐
                    │     state = "first"       │
                    │  Submit 3 plan steps      │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        QStash calls         QStash calls        QStash calls
        (plan step 1)        (plan step 2)       (plan step 3)
              │                   │                   │
              ▼                   ▼                   ▼
        state="partial"      state="partial"     state="partial"
        Execute step 1       Execute step 2      Execute step 3
        Submit result        Submit result       Submit result
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                    QStash calls with all results
                                  │
                    ┌─────────────┴─────────────┐
                    │      state = "last"       │
                    │   Return [r1, r2, r3]     │
                    └───────────────────────────┘
```

---

## State Management

### No Local State

All state lives in QStash:
- **Steps** are serialized as base64 JSON in request body
- **Deduplication** via messageId ensures exactly-once semantics
- **Replay** reconstructs state by re-running route function

### Step Serialization

```typescript
// Steps arrive as RawStep[]
interface RawStep {
  messageId: string;
  body: string;       // Base64-encoded Step JSON
  callType: "step" | "toCallback" | "fromCallback";
}

// Decoded to Step
interface Step<TOutput = unknown> {
  stepId: number;
  stepName: string;
  stepType: StepType;
  out?: TOutput;           // Result (JSON-stringified)
  concurrent?: number;     // For parallel steps
  targetStep?: number;     // For plan steps
  sleepFor?: Duration;     // For sleep steps
  sleepUntil?: number;     // For sleepUntil steps
  waitEventId?: string;    // For wait steps
  // ... call-specific fields
}
```

### Deduplication Logic

```typescript
// src/workflow-parser.ts:98-120
const deduplicateSteps = (steps: Step[]): Step[] => {
  const targetStepIds: number[] = [];
  const stepIds: number[] = [];

  for (const step of steps) {
    if (step.stepId === 0) {
      // Plan step - dedupe by targetStep
      if (!targetStepIds.includes(step.targetStep ?? 0)) {
        deduplicatedSteps.push(step);
        targetStepIds.push(step.targetStep ?? 0);
      }
    } else {
      // Result step - dedupe by stepId
      if (!stepIds.includes(step.stepId)) {
        deduplicatedSteps.push(step);
        stepIds.push(step.stepId);
      }
    }
  }
};
```

---

## Middleware System

### Event Types

**Lifecycle Events** (require context):
- `beforeExecution` - Before step function runs
- `afterExecution` - After step completes (with result)
- `runStarted` - First step of workflow run starts
- `runCompleted` - Workflow run finishes

**Debug Events** (for logging/monitoring):
- `onError` - Error occurred
- `onWarning` - Warning (e.g., duplicate step)
- `onInfo` - Informational message

### Middleware Registration

```typescript
export const { POST } = serve(routeFunction, {
  middlewares: [
    {
      name: "my-logger",
      init: async () => {
        // Initialize once
      },
      callbacks: {
        onInfo: async ({ info, workflowRunId }) => {
          console.log(`[${workflowRunId}] ${info}`);
        },
        beforeExecution: async ({ stepName, context }) => {
          console.log(`Starting step: ${stepName}`);
        },
        afterExecution: async ({ stepName, result, context }) => {
          console.log(`Completed step: ${stepName}`, result);
        },
      },
    },
  ],
});
```

### MiddlewareManager Flow

```typescript
// src/middleware/manager.ts
class MiddlewareManager {
  async dispatchDebug(event, params) {
    // 1. Initialize all middlewares
    await Promise.all(this.middlewares.map(m => m.ensureInit()));

    // 2. Execute callbacks
    await Promise.all(this.middlewares.map(async (middleware) => {
      const callback = middleware.getCallback(event);
      if (callback) {
        await callback({ ...params, workflowRunId: this.workflowRunId });
      }
    }));

    // 3. Default console logging for errors/warnings
    if (event === "onError") onErrorWithConsole(params);
  }
}
```

---

## Error Handling

### Error Hierarchy

```
QstashError (from @upstash/qstash)
    │
    └── WorkflowError
            │
            └── WorkflowAbort (NOT an error - control flow!)
                    │
                    ├── WorkflowAuthError (dry-run found step)
                    ├── WorkflowCancelAbort (user called context.cancel())
                    ├── WorkflowNonRetryableError (fail permanently)
                    └── WorkflowRetryAfterError (retry with delay)
```

### WorkflowAbort as Control Flow

```typescript
// src/error.ts:18-36
export class WorkflowAbort extends Error {
  public stepName: string;
  public stepInfo?: Step;

  constructor(stepName: string, stepInfo?: Step) {
    super(
      "This is an Upstash Workflow error thrown after a step executes. " +
      "It is expected to be raised. Make sure that you await for each step."
    );
    this.name = "WorkflowAbort";
    // ...
  }
}
```

### Failure Callbacks

When a step exhausts retries:

```typescript
export const { POST } = serve(routeFunction, {
  failureFunction: async ({
    context,
    failStatus,
    failResponse,
    failHeaders,
    failStack,
  }) => {
    // Handle exhausted retries
    await sendAlert(`Workflow ${context.workflowRunId} failed: ${failResponse}`);
  },
});
```

---

## Platform Adapters

Each framework has an adapter that wraps `serveBase()`:

| Platform | File | Pattern |
|----------|------|---------|
| Next.js App Router | `platforms/nextjs.ts:33-48` | Returns `{ POST }` |
| Next.js Pages Router | `platforms/nextjs.ts:77-116` | Returns `{ handler: NextApiHandler }` |
| Express | `platforms/express.ts` | Middleware pattern |
| Hono | `platforms/hono.ts` | Returns handler function |
| Cloudflare Workers | `platforms/cloudflare.ts` | Returns fetch handler |
| Astro | `platforms/astro.ts` | Returns endpoint handler |
| SvelteKit | `platforms/svelte.ts` | Returns `{ POST }` |
| SolidStart | `platforms/solidjs.ts` | Returns handler |
| H3/Nuxt | `platforms/h3.ts` | Returns event handler |
| TanStack Start | `platforms/tanstack.ts` | Returns handler |

### Adapter Pattern

```typescript
// platforms/nextjs.ts:33-48
export const serve = <TInitialPayload, TResult>(
  routeFunction: RouteFunction<TInitialPayload, TResult>,
  options?: WorkflowServeOptions<TInitialPayload, TResult>
) => {
  // Wrap serveBase with framework-specific telemetry
  const { handler: serveHandler } = serveBase<TInitialPayload, Request, Response, TResult>(
    routeFunction,
    appTelemetry,  // { sdk, framework: "nextjs", runtime }
    options
  );

  // Return framework-specific export shape
  return {
    POST: async (request: Request) => {
      return await serveHandler(request);
    },
  };
};
```

---

## External Client API

The `Client` class provides workflow management from outside the workflow:

```typescript
import { Client } from "@upstash/workflow";
const client = new Client({ token: "<QSTASH_TOKEN>" });

// Trigger new workflow run
const { workflowRunId } = await client.trigger({
  url: "https://my-app.com/api/workflow",
  body: { userId: 123 },
});

// Cancel workflow(s)
await client.cancel({ ids: workflowRunId });
await client.cancel({ urlStartingWith: "https://my-app.com" });
await client.cancel({ all: true });

// Notify waiting workflows
await client.notify({
  eventId: "payment.confirmed",
  eventData: { amount: 99.99 },
});

// Get workflows waiting for an event
const waiters = await client.getWaiters({ eventId: "payment.confirmed" });

// Get workflow logs
const { runs, cursor } = await client.logs({ workflowRunId });
```

---

## Key Implementation Details

### Step Validation

The SDK validates that steps match between invocations:

```typescript
// src/context/auto-executor.ts:430-445
const validateStep = (lazyStep: BaseLazyStep, stepFromRequest: Step): void => {
  if (lazyStep.stepName !== stepFromRequest.stepName) {
    throw new WorkflowError(
      `Incompatible step name. Expected '${lazyStep.stepName}', ` +
      `got '${stepFromRequest.stepName}' from the request`
    );
  }
  if (lazyStep.stepType !== stepFromRequest.stepType) {
    throw new WorkflowError(
      `Incompatible step type. Expected '${lazyStep.stepType}', ` +
      `got '${stepFromRequest.stepType}' from the request`
    );
  }
};
```

### Nested Step Prevention

Steps cannot be nested:

```typescript
// src/context/auto-executor.ts:70-76
public async addStep(stepInfo: BaseLazyStep) {
  if (this.executingStep) {
    throw new WorkflowError(
      "A step can not be run inside another step." +
      ` Tried to run '${stepInfo.stepName}' inside '${this.executingStep}'`
    );
  }
  // ...
}
```

### Call Step (HTTP without Runtime Cost)

The `Call` step uses QStash callbacks to make HTTP calls without consuming compute:

```typescript
// src/context/steps.ts:434-483
getHeaders({ context, step }) {
  return {
    headers: {
      // ... standard headers

      // QStash will call this URL with the response
      "Upstash-Callback": context.url,
      "Upstash-Callback-Workflow-RunId": context.workflowRunId,
      "Upstash-Callback-Workflow-CallType": "fromCallback",

      // Forward step info in callback
      "Upstash-Callback-Forward-Upstash-Workflow-StepId": step.stepId.toString(),
      "Upstash-Callback-Forward-Upstash-Workflow-StepName": this.stepName,
      "Upstash-Callback-Forward-Upstash-Workflow-StepType": this.stepType,
    }
  };
}
```

---

## Best Practices

1. **Always await steps** - Non-awaited steps cause undefined behavior
2. **Don't wrap steps in try/catch** - `WorkflowAbort` must propagate
3. **Keep route functions deterministic** - Same input = same steps
4. **Use `context.call()` for HTTP** - Zero runtime cost during wait
5. **Validate early** - Check inputs before first step (auth check pattern)

---

## Summary

| Concept | Purpose |
|---------|---------|
| `serveBase()` | Entry point, request handling, response generation |
| `WorkflowContext` | User-facing API for defining workflow steps |
| `AutoExecutor` | Step sequencing, memoization, parallel detection |
| `BaseLazyStep` | Abstract step with plan/result generation |
| `WorkflowAbort` | Control flow signal (not an error!) |
| QStash | State persistence, scheduling, coordination |
| Platform Adapters | Framework-specific wrappers for `serveBase()` |
