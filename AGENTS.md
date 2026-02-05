# Agent Context Hub

Central index of context files for AI agents and coding assistants working with this codebase.

## Quick Reference

| Context File | Domain | Key Concepts |
|--------------|--------|--------------|
| [effect-Context](./context/effect-Context.md) | Dependency Injection | Context.Tag, Effect.Service, Layers |
| [effect-Schema](./context/effect-Schema.md) | Validation | Schema types, transforms, refinements |
| [effect-Queue](./context/effect-Queue.md) | Concurrency | Fiber-safe queues, backpressure, producer/consumer |
| [effect-atom](./context/effect-atom.md) | State Management | Reactive atoms, Result type, React hooks |
| [sql-drizzle](./context/sql-drizzle.md) | Database ORM | Drizzle + Effect, remote proxy, transactions |
| [workflow](./context/workflow.md) | Durable Execution | QStash, steps, parallel execution |
| [workflow-TanstackStart](./context/workflow-TanstackStart.md) | Framework Integration | serve, serveMany, createWorkflow |

---

## Effect Context

> Dependency injection and type-safe service composition

**File:** [effect-Context.md](./context/effect-Context.md)

| Section | Description |
|---------|-------------|
| [Effect Type Signature](./context/effect-Context.md#the-effect-type-signature) | `Effect<Success, Error, Requirements>` explained |
| [Core Concepts](./context/effect-Context.md#core-concepts) | Context.Tag, using services, providing services |
| [Context.Tag vs Effect.Service](./context/effect-Context.md#two-patterns-contexttag-vs-effectservice) | Pattern comparison with usage guidance |
| [Service Construction](./context/effect-Context.md#service-construction-options) | sync, effect, scoped constructors |
| [Layer Composition](./context/effect-Context.md#layer-composition) | Creating/composing layers, vertical/horizontal |
| [Type-Level Tracking](./context/effect-Context.md#type-level-dependency-tracking) | Compiler-enforced dependency safety |
| [Context Operations](./context/effect-Context.md#context-operations) | Low-level Context module operations |
| [Real-World Patterns](./context/effect-Context.md#real-world-patterns) | Ref state, factory services, scoped resources |
| [Common Mistakes](./context/effect-Context.md#common-mistakes) | Yield errors, layer order, async init |

---

## Effect Schema

> Runtime validation and type transformation with full TypeScript inference

**File:** [effect-Schema.md](./context/effect-Schema.md)

| Section | Description |
|---------|-------------|
| [Core Concepts](./context/effect-Schema.md#core-concepts) | `Schema<A, I, R>` signature, encode/decode flow, AST |
| [Built-in Schemas](./context/effect-Schema.md#built-in-schemas) | Primitives, strings, numbers, collections, structs, Effect types, binary |
| [Combinators Reference](./context/effect-Schema.md#combinators-reference) | Union, optional, transforms, refinements, brands, recursive |
| [Decoding & Encoding](./context/effect-Schema.md#decoding--encoding) | API variants, validation, ParseError, formatting |
| [Common Patterns](./context/effect-Schema.md#common-patterns) | Class-based, tagged errors, discriminated unions, field renaming |
| [Effect Integration](./context/effect-Schema.md#effect-integration) | Services in schema context, transformOrFail, annotations |
| [Quick Reference](./context/effect-Schema.md#quick-reference) | Cheatsheet tables, type extraction, introspection |

### Schema Subsections

| Topic | Section |
|-------|---------|
| Primitive types | [Primitive Types](./context/effect-Schema.md#primitive-types) |
| String validation | [String Variants](./context/effect-Schema.md#string-variants) |
| Number constraints | [Number Variants](./context/effect-Schema.md#number-variants) |
| Arrays/tuples/records | [Collections](./context/effect-Schema.md#collections) |
| Object schemas | [Struct](./context/effect-Schema.md#struct-object-schemas) |
| Option/Either/Duration | [Effect Types](./context/effect-Schema.md#effect-types) |
| Union & discrimination | [Union & Discrimination](./context/effect-Schema.md#union--discrimination) |
| Optional/default fields | [Property Signatures](./context/effect-Schema.md#property-signatures) |
| Pick/omit/extend | [Struct Operations](./context/effect-Schema.md#struct-operations) |
| Custom transforms | [Transforms](./context/effect-Schema.md#transforms) |
| Filters & refinements | [Refinements & Filters](./context/effect-Schema.md#refinements--filters) |
| Branded types | [Branded Types](./context/effect-Schema.md#branded-types) |
| Recursive schemas | [Recursive Schemas](./context/effect-Schema.md#recursive-schemas) |
| API to use | [API Variants](./context/effect-Schema.md#api-variants) |
| Error handling | [ParseError Structure](./context/effect-Schema.md#parseerror-structure) |
| Parse options | [ParseOptions](./context/effect-Schema.md#parseoptions) |

---

## Effect Atom

> Reactive state management for Effect.js + React

**File:** [effect-atom.md](./context/effect-atom.md)

| Section | Description |
|---------|-------------|
| [Core Mental Model](./context/effect-atom.md#core-mental-model) | Atoms as reactive Effect containers |
| [Key Concepts](./context/effect-atom.md#key-concepts) | Result type, Atom types, reference identity |
| [Project Patterns](./context/effect-atom.md#project-patterns) | Runtime setup, service atoms, families, derived atoms |
| [React Hooks](./context/effect-atom.md#react-hooks) | useAtomValue, useAtomSet, Suspense, refresh |
| [Toast Integration](./context/effect-atom.md#toast-integration-withtoast) | withToast wrapper for notifications |
| [Tagged Errors Pattern](./context/effect-atom.md#tagged-errors-pattern) | Data.TaggedError for typed error handling |
| [Memory Management](./context/effect-atom.md#memory-management) | keepAlive, TTL, finalizers |
| [Common Patterns](./context/effect-atom.md#common-patterns) | Loading states, conditional rendering, chaining |
| [API Quick Reference](./context/effect-atom.md#api-quick-reference) | Cheat sheet tables for creation, modifiers, hooks |

### Atom Subsections

| Topic | Section |
|-------|---------|
| Result<A, E> type | [Result — Not Promises](./context/effect-atom.md#resulta-e--not-promises) |
| Atom types table | [Atom Types](./context/effect-atom.md#atom-types) |
| Stable references | [Reference Identity Matters](./context/effect-atom.md#reference-identity-matters) |
| Runtime setup | [Runtime Setup](./context/effect-atom.md#runtime-setup-makeatomruntimets) |
| Service-backed atoms | [Creating Service-Backed Atoms](./context/effect-atom.md#creating-service-backed-atoms) |
| Function atoms | [Function Atoms with runtime.fn](./context/effect-atom.md#function-atoms-with-runtimefn) |
| Parameterized atoms | [Parameterized Atoms with Atom.family](./context/effect-atom.md#parameterized-atoms-with-atomfamily) |
| Derived atoms | [Derived Atoms with Dependencies](./context/effect-atom.md#derived-atoms-with-dependencies) |
| Reading values | [Reading Values](./context/effect-atom.md#reading-values) |
| Writing values | [Writing Values](./context/effect-atom.md#writing-values) |
| Suspense support | [Suspense Support](./context/effect-atom.md#suspense-support) |
| Force refresh | [Force Refresh](./context/effect-atom.md#force-refresh) |

---

## Effect Queue

> Fiber-safe, bounded queues for concurrent producer/consumer patterns

**File:** [effect-Queue.md](./context/effect-Queue.md)

| Section | Description |
|---------|-------------|
| [Core Types](./context/effect-Queue.md#core-types) | Queue, Enqueue, Dequeue type hierarchy, BaseQueue interface |
| [Queue Variants](./context/effect-Queue.md#queue-variants) | bounded, unbounded, dropping, sliding constructors |
| [Strategy System](./context/effect-Queue.md#strategy-system) | BackPressure, Dropping, Sliding overflow strategies |
| [Core Operations](./context/effect-Queue.md#core-operations) | offer/offerAll (write), take/takeAll/takeBetween (read) |
| [Backpressure & Suspension](./context/effect-Queue.md#backpressure--suspension) | Deferred-based fiber suspension, taker-putter matching |
| [Shutdown Semantics](./context/effect-Queue.md#shutdown-semantics) | Clean teardown, post-shutdown behavior |
| [Size Semantics](./context/effect-Queue.md#size-semantics) | Negative size = suspended takers, unsafeSize |
| [Patterns](./context/effect-Queue.md#patterns) | Producer/consumer, rate limiting, sliding window, fan-out |
| [Common Mistakes](./context/effect-Queue.md#common-mistakes) | Shutdown interrupts, unbounded memory, offer return values |
| [Quick Reference](./context/effect-Queue.md#quick-reference) | Constructor, operation, state, refinement cheatsheets |

### Queue Subsections

| Topic | Section |
|-------|---------|
| Type hierarchy diagram | [Type Hierarchy](./context/effect-Queue.md#type-hierarchy) |
| Write-side API | [Enqueue — Write Side](./context/effect-Queue.md#enqueue--write-side) |
| Read-side API (is an Effect!) | [Dequeue — Read Side](./context/effect-Queue.md#dequeue--read-side) |
| Shared queue state API | [BaseQueue — Shared Interface](./context/effect-Queue.md#basequeue--shared-interface) |
| BackPressure internals | [BackPressureStrategy](./context/effect-Queue.md#backpressurestrategy) |
| Dropping internals | [DroppingStrategy](./context/effect-Queue.md#droppingstrategy) |
| Sliding internals | [SlidingStrategy](./context/effect-Queue.md#slidingstrategy) |
| Offer flow (internal) | [Offering (Write)](./context/effect-Queue.md#offering-write) |
| Take flow (internal) | [Taking (Read)](./context/effect-Queue.md#taking-read) |
| Deferred suspension model | [How Fibers Suspend](./context/effect-Queue.md#how-fibers-suspend) |
| Zero-copy optimization | [Taker-Putter Direct Matching](./context/effect-Queue.md#taker-putter-direct-matching) |
| Shutdown flow | [Shutdown Flow](./context/effect-Queue.md#shutdown-flow) |
| Post-shutdown table | [Post-Shutdown Behavior](./context/effect-Queue.md#post-shutdown-behavior) |
| Producer/consumer pattern | [Producer / Consumer](./context/effect-Queue.md#producer--consumer) |
| Rate limiting pattern | [Bounded Work Queue (Rate Limiting)](./context/effect-Queue.md#bounded-work-queue-rate-limiting) |
| Sliding window pattern | [Sliding Window (Latest N)](./context/effect-Queue.md#sliding-window-latest-n) |
| Fan-out pattern | [Fan-Out (Multiple Consumers)](./context/effect-Queue.md#fan-out-multiple-consumers) |

---

## SQL Drizzle

> Type-safe ORM integration for Effect via remote proxy adapters

**File:** [sql-drizzle.md](./context/sql-drizzle.md)

| Section | Description |
|---------|-------------|
| [Architecture](./context/sql-drizzle.md#architecture) | Remote proxy pattern, callback bridge, prototype patching |
| [Core Concepts](./context/sql-drizzle.md#core-concepts) | Prototype patching, Context Tags, constructors, layers |
| [Setup & Layer Composition](./context/sql-drizzle.md#setup--layer-composition) | Basic setup, schema config, Service pattern |
| [Query Patterns](./context/sql-drizzle.md#query-patterns) | SELECT, INSERT, UPDATE, DELETE examples |
| [Transactions](./context/sql-drizzle.md#transactions) | sql.withTransaction() pattern |
| [Error Handling](./context/sql-drizzle.md#error-handling) | SqlError, constraint violations |
| [Database-Specific Notes](./context/sql-drizzle.md#database-specific-notes) | PostgreSQL vs MySQL vs SQLite differences |

### SQL Drizzle Subsections

| Topic | Section |
|-------|---------|
| Remote proxy pattern | [Architecture](./context/sql-drizzle.md#architecture) |
| QueryPromise → Effectable | [Prototype Patching](./context/sql-drizzle.md#prototype-patching---the-magic) |
| PgDrizzle, MysqlDrizzle, SqliteDrizzle | [Context Tags](./context/sql-drizzle.md#context-tags) |
| make(), makeWithConfig() | [Constructors](./context/sql-drizzle.md#constructors) |
| layer, layerWithConfig() | [Layers](./context/sql-drizzle.md#layers) |
| Effect.Service ORM wrapper | [Service Pattern](./context/sql-drizzle.md#service-pattern-recommended) |
| .returning() vs .$returningId() | [Database-Specific Notes](./context/sql-drizzle.md#database-specific-notes) |
| db.query.users.findMany() | [Relational Queries](./context/sql-drizzle.md#relational-queries-with-schema) |

---

## Upstash Workflow (Deep Analysis)

> Durable serverless workflow engine built on QStash

**File:** [workflow.md](./context/workflow.md)

| Section | Description |
|---------|-------------|
| [Architecture](./context/workflow.md#architecture) | Request flow diagram, QStash as persistence layer |
| [Core Components](./context/workflow.md#core-components) | serveBase, WorkflowContext, AutoExecutor, BaseLazyStep |
| [Step Types](./context/workflow.md#step-types) | Run, Sleep, Call, Wait, Notify, Invoke, Webhook types |
| [Lazy Execution Pattern](./context/workflow.md#lazy-execution-pattern) | Plan steps vs result steps, deferred execution |
| [Execution Flow](./context/workflow.md#execution-flow-critical-path) | Request validation, step parsing, context creation |
| [Parallel Execution](./context/workflow.md#parallel-execution) | Promise.all detection, parallel call states, flow diagram |
| [State Management](./context/workflow.md#state-management) | No local state, step serialization, deduplication |
| [Workflow-Level Idempotency](./context/workflow.md#workflow-level-idempotency-not-supported) | Gap analysis and workarounds |
| [Middleware System](./context/workflow.md#middleware-system) | Lifecycle events, debug events, registration |
| [Error Handling](./context/workflow.md#error-handling) | Error hierarchy, WorkflowAbort as control flow |
| [Platform Adapters](./context/workflow.md#platform-adapters) | Next.js, Express, Hono, Cloudflare, TanStack adapters |
| [External Client API](./context/workflow.md#external-client-api) | Trigger, cancel, notify, getWaiters, logs |
| [Key Implementation Details](./context/workflow.md#key-implementation-details) | Step validation, nested prevention, Call step |
| [Best Practices](./context/workflow.md#best-practices) | Always await, don't catch WorkflowAbort, determinism |

### Workflow Subsections

| Topic | Section |
|-------|---------|
| Request flow diagram | [Request Flow](./context/workflow.md#request-flow) |
| QStash roles | [QStash as Persistence Layer](./context/workflow.md#qstash-as-persistence-layer) |
| Step type table | [Step Types](./context/workflow.md#step-types) |
| Plan vs result steps | [Plan Steps vs Result Steps](./context/workflow.md#plan-steps-vs-result-steps) |
| Parallel detection | [Detection via Promise.all](./context/workflow.md#detection-via-promiseall) |
| Parallel states | [Parallel Call States](./context/workflow.md#parallel-call-states) |
| Step serialization | [Step Serialization](./context/workflow.md#step-serialization) |
| Deduplication logic | [Deduplication Logic](./context/workflow.md#deduplication-logic) |
| Idempotency workarounds | [Workarounds](./context/workflow.md#workarounds) |
| Middleware events | [Event Types](./context/workflow.md#event-types) |
| Middleware registration | [Middleware Registration](./context/workflow.md#middleware-registration) |
| Error hierarchy | [Error Hierarchy](./context/workflow.md#error-hierarchy) |
| WorkflowAbort | [WorkflowAbort as Control Flow](./context/workflow.md#workflowabort-as-control-flow) |
| Failure callbacks | [Failure Callbacks](./context/workflow.md#failure-callbacks) |
| Adapter pattern | [Adapter Pattern](./context/workflow.md#adapter-pattern) |

---

## Upstash Workflow (TanStack Start)

> Integration guide for TanStack Start framework

**File:** [workflow-TanstackStart.md](./context/workflow-TanstackStart.md)

| Section | Description |
|---------|-------------|
| [Core Concepts](./context/workflow-TanstackStart.md#core-concepts) | context.run() durable steps, context.requestPayload |
| [Pattern 1: serve](./context/workflow-TanstackStart.md#pattern-1-serve-single-workflow) | Single workflow per endpoint |
| [Pattern 2: serveMany](./context/workflow-TanstackStart.md#pattern-2-servemany--createworkflow) | Multiple workflows, dynamic routing |
| [context.invoke()](./context/workflow-TanstackStart.md#contextinvoke--workflow-composition) | Workflow-to-workflow composition |
| [WorkflowContext Type](./context/workflow-TanstackStart.md#workflowcontextt-type) | Full typing for workflow context |
| [Configuration Options](./context/workflow-TanstackStart.md#configuration-options) | retries, createWorkflow options |
| [Development Setup](./context/workflow-TanstackStart.md#development-setup) | QStash CLI, env vars, local dev |
| [Testing](./context/workflow-TanstackStart.md#testing) | curl examples for single and multi-workflow |
| [Adapter Note](./context/workflow-TanstackStart.md#adapter-note) | Framework import paths table |

---

## Cross-Reference: Common Tasks

| Task | Primary Context | Related Sections |
|------|-----------------|------------------|
| Create a service | [effect-Context](./context/effect-Context.md#core-concepts) | [Effect.Service pattern](./context/effect-Context.md#pattern-2-effectservice-higher-level) |
| Validate API data | [effect-Schema](./context/effect-Schema.md#decoding--encoding) | [Common Patterns](./context/effect-Schema.md#common-patterns) |
| Fetch data in React | [effect-atom](./context/effect-atom.md#creating-service-backed-atoms) | [React Hooks](./context/effect-atom.md#react-hooks) |
| Handle loading states | [effect-atom](./context/effect-atom.md#common-patterns) | [Result type](./context/effect-atom.md#resulta-e--not-promises) |
| Query database with Drizzle | [sql-drizzle](./context/sql-drizzle.md#query-patterns) | [Service Pattern](./context/sql-drizzle.md#service-pattern-recommended) |
| Database transactions | [sql-drizzle](./context/sql-drizzle.md#transactions) | [Error Handling](./context/sql-drizzle.md#error-handling) |
| Inter-fiber communication | [effect-Queue](./context/effect-Queue.md#patterns) | [Backpressure](./context/effect-Queue.md#backpressure--suspension) |
| Rate limit / work queue | [effect-Queue](./context/effect-Queue.md#bounded-work-queue-rate-limiting) | [Queue Variants](./context/effect-Queue.md#queue-variants) |
| Fan-out work distribution | [effect-Queue](./context/effect-Queue.md#fan-out-multiple-consumers) | [Core Operations](./context/effect-Queue.md#core-operations) |
| Create durable workflow | [workflow-TanstackStart](./context/workflow-TanstackStart.md#pattern-1-serve-single-workflow) | [Deep dive](./context/workflow.md#execution-flow-critical-path) |
| Compose workflows | [workflow-TanstackStart](./context/workflow-TanstackStart.md#contextinvoke--workflow-composition) | [serveMany](./context/workflow-TanstackStart.md#pattern-2-servemany--createworkflow) |
| Handle workflow errors | [workflow](./context/workflow.md#error-handling) | [WorkflowAbort](./context/workflow.md#workflowabort-as-control-flow) |
| Prevent duplicate workflows | [workflow](./context/workflow.md#workflow-level-idempotency-not-supported) | [Workarounds](./context/workflow.md#workarounds) |
| Test workflows locally | [workflow-TanstackStart](./context/workflow-TanstackStart.md#development-setup) | [Testing](./context/workflow-TanstackStart.md#testing) |

---

## Project Notes

### apps/consultation
- **State Management**: Uses `@effect-atom/atom-react` (NOT Jotai)
- **Framework**: TanStack Start
- **Workflows**: Upstash Workflow with QStash

### Adding Context

To add a new context file:
1. Create markdown file in `./context/`
2. Add entry to this index with section-level links
3. Include in cross-reference table if applicable
