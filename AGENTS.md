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
| [effect-Workflow](./context/effect-Workflow.md) | Durable Workflows | @effect/workflow, Activities, DurableClock, DurableDeferred |
| [effect-Cluster](./context/effect-Cluster.md) | Distributed Systems | Entity, Sharding, Runners, MessageStorage |
| [effect-Pipe](./context/effect-Pipe.md) | Composition | Standalone pipe, .pipe() method, flow, Pipeable |
| [radix-TransactionStream](./context/radix-TransactionStream.md) | Radix Ledger | Gateway pagination stream, cursor via Ref, fatal errors |
| [radix-Gateway](./context/radix-Gateway.md) | Radix Ledger | Gateway API client, tagged errors, pagination, SBOR schema, ROLA |


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

## Effect Pipe

> Standalone `pipe` function and `.pipe()` method for composing transformations left-to-right

**File:** [effect-Pipe.md](./context/effect-Pipe.md)

| Section | Description |
|---------|-------------|
| [Why Pipe Exists](./context/effect-Pipe.md#why-pipe-exists) | Nested calls vs pipe, reading order |
| [Standalone vs Method .pipe()](./context/effect-Pipe.md#standalone-vs-method-pipe) | Two forms, when-to-use table, nested combo pattern |
| [Pipeable Interface](./context/effect-Pipe.md#pipeable-interface) | Which types implement `.pipe()` |
| [Pipe Patterns by Domain](./context/effect-Pipe.md#pipe-patterns-by-domain) | Effect chaining, Schema branding, Layer composition, Option, Config, Array+flow, Either |
| [pipe vs Effect.gen vs Effect.fn](./context/effect-Pipe.md#pipe-vs-effectgen-vs-effectfn) | Decision table, mixing gen + pipe |
| [flow vs pipe](./context/effect-Pipe.md#flow-vs-pipe) | Create function vs apply immediately |
| [Common Mistakes](./context/effect-Pipe.md#common-mistakes) | Import errors, double-calling, split chains, wrong form |
| [Quick Reference](./context/effect-Pipe.md#quick-reference) | Forms table, codebase patterns summary |

### Pipe Subsections

| Topic | Section |
|-------|---------|
| Nested combo (method wrapping standalone) | [Nested Combo Pattern](./context/effect-Pipe.md#nested-combo-pattern) |
| Effect chaining (map/flatMap/catchTag) | [Effect Chaining](./context/effect-Pipe.md#effect-chaining-map--flatmap--catchtag) |
| Schema.brand with pipe | [Schema Branding & Validation](./context/effect-Pipe.md#schema-branding--validation) |
| Layer.provide / Layer.provideMerge | [Layer Composition](./context/effect-Pipe.md#layer-composition) |
| Option.flatMap / Option.match | [Option Chaining](./context/effect-Pipe.md#option-chaining-standalone-pipe) |
| Config.withDefault | [Config Defaults](./context/effect-Pipe.md#config-defaults) |
| Pure Either pipelines | [Pure Value Pipelines](./context/effect-Pipe.md#pure-value-pipelines-either-chain) |
| When to use gen vs pipe | [Decision Table](./context/effect-Pipe.md#decision-table) |
| flow() for reusable transforms | [flow vs pipe](./context/effect-Pipe.md#flow-vs-pipe) |

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

## Effect Workflow (@effect/workflow)

> Durable, resumable, fault-tolerant workflows for Effect

**File:** [effect-Workflow.md](./context/effect-Workflow.md)

| Section | Description |
|---------|-------------|
| [Architecture Overview](./context/effect-Workflow.md#architecture-overview) | Module dependency graph, engine abstraction layer |
| [Workflow](./context/effect-Workflow.md#workflow) | make, fromTaggedRequest, Result types, annotations, compensation, scope |
| [Activity](./context/effect-Workflow.md#activity) | At-most-once execution, retry, idempotencyKey, raceAll |
| [DurableClock](./context/effect-Workflow.md#durableclock) | sleep with in-memory threshold, engine-scheduled wake-up |
| [DurableDeferred](./context/effect-Workflow.md#durabledeferred) | External signal/latch, Token system, await/done/succeed/fail |
| [DurableQueue](./context/effect-Workflow.md#durablequeue) | PersistedQueue wrapper, process, worker, trace propagation |
| [DurableRateLimiter](./context/effect-Workflow.md#durableratelimiter) | Rate-limited Activity with durable delay |
| [WorkflowEngine](./context/effect-Workflow.md#workflowengine) | Service definition, WorkflowInstance, Encoded interface, layerMemory |
| [WorkflowProxy & Server](./context/effect-Workflow.md#workflowproxy--workflowproxyserver) | Auto-generated RPC/HTTP endpoints from workflow definitions |
| [Execution Lifecycle](./context/effect-Workflow.md#execution-lifecycle) | Suspend/resume cycle, activity caching, nested workflow propagation |
| [Patterns](./context/effect-Workflow.md#patterns) | Activity + sleep + deferred, nested workflows, SuspendOnFailure, DurableQueue |
| [Testing](./context/effect-Workflow.md#testing) | TestClock, layerMemory, layer composition |
| [Common Mistakes](./context/effect-Workflow.md#common-mistakes) | Non-deterministic keys, compensation scope, side effects outside activities |
| [Quick Reference](./context/effect-Workflow.md#quick-reference) | Module exports, requirement tags, defaults table |

### Effect Workflow Subsections

| Topic | Section |
|-------|---------|
| Execution ID derivation | [Constructor: Workflow.make](./context/effect-Workflow.md#constructor-workflowmake) |
| Result = Complete \| Suspended | [Result Types](./context/effect-Workflow.md#result-types) |
| CaptureDefects, SuspendOnFailure | [Annotations](./context/effect-Workflow.md#annotations) |
| Activity caching by activityId | [Activity Execution Flow](./context/effect-Workflow.md#activity-execution-flow-internal) |
| DurableClock threshold logic | [DurableClock.sleep](./context/effect-Workflow.md#durableclocksleep) |
| Token encode/decode (Base64URL) | [Token System](./context/effect-Workflow.md#token-system) |
| Full suspend/resume state machine | [Suspend / Resume Cycle](./context/effect-Workflow.md#suspend--resume-cycle) |
| Building custom engine backends | [Encoded Interface](./context/effect-Workflow.md#encoded-interface--building-custom-engines) |
| Parent-child interrupt propagation | [Nested Workflow Support](./context/effect-Workflow.md#nested-workflow-support) |

---

## Effect Cluster (@effect/cluster)

> Distributed virtual actor system with persistent messaging, sharding, and RPC-based entities

**File:** [effect-Cluster.md](./context/effect-Cluster.md)

| Section | Description |
|---------|-------------|
| [Architecture Overview](./context/effect-Cluster.md#architecture-overview) | Module dependency graph, core → envelope → entity → storage → runner → sharding |
| [Core Types](./context/effect-Cluster.md#core-types) | EntityId, EntityType, ShardId, EntityAddress, RunnerAddress, Snowflake |
| [Entity](./context/effect-Cluster.md#entity) | make, toLayer, toLayerMailbox, client, makeTestClient, keepAlive, RPC integration |
| [Envelope & Message](./context/effect-Cluster.md#envelope--message) | Request/AckChunk/Interrupt wire protocol, Message.Incoming/Outgoing |
| [Reply](./context/effect-Cluster.md#reply) | WithExit (final), Chunk (streaming), ReplyWithContext |
| [Sharding](./context/effect-Cluster.md#sharding) | Core coordination: getShardId, makeClient, registerEntity, send, notify |
| [ShardingConfig](./context/effect-Cluster.md#shardingconfig) | 19 config fields, defaults, layerFromEnv() |
| [MessageStorage](./context/effect-Cluster.md#messagestorage) | Persistence layer, SaveResult idempotency, memory/SQL drivers |
| [Runner & RunnerStorage](./context/effect-Cluster.md#runner--runnerstorage) | Node registration, shard locking, RunnerHealth (noop/ping/k8s) |
| [Transport](./context/effect-Cluster.md#transport) | HttpRunner, SocketRunner, SingleRunner (all-in-one SQL) |
| [Singleton](./context/effect-Cluster.md#singleton) | Per-shard singleton tasks via Sharding.registerSingleton |
| [ClusterCron](./context/effect-Cluster.md#clustercron) | Distributed cron using Entity + Singleton + DeliverAt |
| [EntityResource](./context/effect-Cluster.md#entityresource) | Long-lived resources via RcRef with keepAlive |
| [EntityProxy](./context/effect-Cluster.md#entityproxy) | toRpcGroup, toHttpApiGroup — RPC/HTTP gateway generation |
| [ClusterWorkflowEngine](./context/effect-Cluster.md#clusterworkflowengine) | Bridge @effect/workflow with @effect/cluster |
| [Error Types](./context/effect-Cluster.md#error-types) | EntityNotAssignedToRunner, MailboxFull, PersistenceError, etc. |
| [Testing](./context/effect-Cluster.md#testing) | TestRunner layer, Entity.makeTestClient, layer composition |
| [Common Mistakes](./context/effect-Cluster.md#common-mistakes) | Missing Persisted annotation, entity idle timeout, runner health |
| [Quick Reference](./context/effect-Cluster.md#quick-reference) | Export table, Context.Tag table, config defaults |

### Effect Cluster Subsections

| Topic | Section |
|-------|---------|
| Snowflake ID generation | [Snowflake & MachineId](./context/effect-Cluster.md#snowflake--machineid) |
| ClusterSchema annotations | [ClusterSchema Annotations](./context/effect-Cluster.md#clusterschema-annotations) |
| Entity handler patterns | [Entity.toLayer](./context/effect-Cluster.md#entitytolayer) |
| Mailbox-based handlers | [Entity.toLayerMailbox](./context/effect-Cluster.md#entitytolayermailbox) |
| Shard assignment logic | [Shard Assignment](./context/effect-Cluster.md#shard-assignment) |
| MessageStorage idempotency | [SaveResult & Idempotency](./context/effect-Cluster.md#saveresult--idempotency) |
| SQL storage backends | [SqlMessageStorage](./context/effect-Cluster.md#sqlmessagestorage) |
| HTTP/WebSocket transport | [HttpRunner](./context/effect-Cluster.md#httprunner) |
| Cluster metrics gauges | [ClusterMetrics](./context/effect-Cluster.md#clustermetrics) |

---

## Radix Transaction Stream (@radix-effects/transaction-stream)

> Infinite polling stream of Radix ledger transactions via Gateway API pagination

**File:** [radix-TransactionStream.md](./context/radix-TransactionStream.md)

| Section | Description |
|---------|-------------|
| [Architecture](./context/radix-TransactionStream.md#architecture) | Stream.paginateEffect + Ref cursor pattern, service diagram |
| [Core Types](./context/radix-TransactionStream.md#core-types) | TransactionStreamService, ConfigService, Config, OptIns schema |
| [Streaming Mechanics](./context/radix-TransactionStream.md#streaming-mechanics) | Pagination loop, cursor advancement, polling, empty-page filtering |
| [Error Handling](./context/radix-TransactionStream.md#error-handling) | 7 gateway errors → Effect.die, rate-limit retry in gateway layer |
| [Configuration](./context/radix-TransactionStream.md#configuration) | ConfigService as Ref, defaults table, runtime mutation |
| [Usage Patterns](./context/radix-TransactionStream.md#usage-patterns) | Providing the service, multi-network concurrency, flattening batches |
| [Gotchas](./context/radix-TransactionStream.md#gotchas) | Ref confusion, fatal errors, batch vs individual, deprecated fields |

### Transaction Stream Subsections

| Topic | Section |
|-------|---------|
| Stream.paginateEffect loop | [Pagination Loop](./context/radix-TransactionStream.md#pagination-loop) |
| Cursor stored in Ref | [Cursor Advancement](./context/radix-TransactionStream.md#cursor-advancement) |
| Sleep when caught up | [Polling When Caught Up](./context/radix-TransactionStream.md#polling-when-caught-up) |
| Stream emits batches not singles | [Empty-Page Filtering](./context/radix-TransactionStream.md#empty-page-filtering) |
| All 7 fatal error tags | [Gateway Errors — All Fatal](./context/radix-TransactionStream.md#gateway-errors--all-fatal) |
| ConfigService is Ref not value | [ConfigService as Ref](./context/radix-TransactionStream.md#configservice-as-ref) |
| Default config values | [Defaults](./context/radix-TransactionStream.md#defaults) |
| Multi-network forking | [Multi-Network Concurrency](./context/radix-TransactionStream.md#multi-network-concurrency) |
| Flattening with Stream.mapConcat | [Flattening to Individual Transactions](./context/radix-TransactionStream.md#flattening-to-individual-transactions) |

---

## Radix Gateway (@radix-effects/gateway)

> Effect wrapper for the Radix Gateway API — tagged errors, pagination, SBOR schema, ROLA verification

**File:** [radix-Gateway.md](./context/radix-Gateway.md)

| Section | Description |
|---------|-------------|
| [Architecture](./context/radix-Gateway.md#architecture) | GatewayApiClient core service, wrapMethod error mapping, dependency tree |
| [Core Types](./context/radix-Gateway.md#core-types) | GatewayApiClient shape, AtLedgerState, Validator, ROLA proof schemas |
| [Error Types](./context/radix-Gateway.md#error-types) | 12 tagged errors mapped from SDK, rate-limit, legacy class errors |
| [Service Catalog](./context/radix-Gateway.md#service-catalog) | 20 services with inputs, outputs, dependencies, config |
| [Pagination & Batching](./context/radix-Gateway.md#pagination--batching) | Exhaustive cursor, chunked batching, chunker utility, concurrency |
| [Error Handling](./context/radix-Gateway.md#error-handling) | SDK error mapping pipeline, 429 retry with sleep |
| [SBOR Schema](./context/radix-Gateway.md#sbor-schema) | 21-kind recursive Effect Schema union, Schema.suspend() |
| [Configuration](./context/radix-Gateway.md#configuration) | 13 config keys with defaults |
| [Usage Patterns](./context/radix-Gateway.md#usage-patterns) | Providing client, fungible balance, KVS, component state, ROLA |
| [Gotchas](./context/radix-Gateway.md#gotchas) | Dual schema, Effect Config, chunker limits, dependency tree |

### Gateway Subsections

| Topic | Section |
|-------|---------|
| wrapMethod error translation | [Error Mapping Pipeline](./context/radix-Gateway.md#error-mapping-pipeline) |
| 429 sleep + retry loop | [Rate-Limit Retry](./context/radix-Gateway.md#rate-limit-retry) |
| Exhaustive cursor loop | [Exhaustive Cursor Pattern](./context/radix-Gateway.md#exhaustive-cursor-pattern) |
| Array chunking for page-size limits | [Chunked Batching Pattern](./context/radix-Gateway.md#chunked-batching-pattern) |
| Schema.suspend() for recursive SBOR | [Recursive Types](./context/radix-Gateway.md#recursive-types-schemasuspend) |
| Zod vs Effect Schema | [Dual Schema System](./context/radix-Gateway.md#1-dual-schema-system-zod--effect-schema) |
| All 13 env var config keys | [Configuration](./context/radix-Gateway.md#configuration) |
| sbor-ez-mode integration | [Component State with sbor-ez-mode Schema](./context/radix-Gateway.md#component-state-with-sbor-ez-mode-schema) |

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
| Create Effect durable workflow | [effect-Workflow](./context/effect-Workflow.md#workflow) | [Patterns](./context/effect-Workflow.md#patterns) |
| Activities (at-most-once) | [effect-Workflow](./context/effect-Workflow.md#activity) | [Execution Flow](./context/effect-Workflow.md#activity-execution-flow-internal) |
| Workflow external signals | [effect-Workflow](./context/effect-Workflow.md#durabledeferred) | [Token System](./context/effect-Workflow.md#token-system) |
| Workflow suspend/resume | [effect-Workflow](./context/effect-Workflow.md#execution-lifecycle) | [DurableClock](./context/effect-Workflow.md#durableclock) |
| Test workflows (Effect) | [effect-Workflow](./context/effect-Workflow.md#testing) | [layerMemory](./context/effect-Workflow.md#layermemory--in-memory-engine) |
| Define cluster entity | [effect-Cluster](./context/effect-Cluster.md#entity) | [Entity.toLayer](./context/effect-Cluster.md#entitytolayer) |
| Shard messages | [effect-Cluster](./context/effect-Cluster.md#sharding) | [Shard Assignment](./context/effect-Cluster.md#shard-assignment) |
| Persist cluster messages | [effect-Cluster](./context/effect-Cluster.md#messagestorage) | [SqlMessageStorage](./context/effect-Cluster.md#sqlmessagestorage) |
| Distributed cron | [effect-Cluster](./context/effect-Cluster.md#clustercron) | [Singleton](./context/effect-Cluster.md#singleton) |
| Cluster workflows | [effect-Cluster](./context/effect-Cluster.md#clusterworkflowengine) | [effect-Workflow](./context/effect-Workflow.md#workflow) |
| Test cluster services | [effect-Cluster](./context/effect-Cluster.md#testing) | [Entity.makeTestClient](./context/effect-Cluster.md#entitymaketestclient) |
| Stream Radix transactions | [radix-TransactionStream](./context/radix-TransactionStream.md#streaming-mechanics) | [Usage Patterns](./context/radix-TransactionStream.md#usage-patterns) |
| Configure transaction stream | [radix-TransactionStream](./context/radix-TransactionStream.md#configuration) | [Defaults](./context/radix-TransactionStream.md#defaults) |
| Handle gateway errors | [radix-TransactionStream](./context/radix-TransactionStream.md#error-handling) | [Gotchas](./context/radix-TransactionStream.md#gotchas) |
| Multi-network streaming | [radix-TransactionStream](./context/radix-TransactionStream.md#multi-network-concurrency) | [ConfigService as Ref](./context/radix-TransactionStream.md#configservice-as-ref) |
| Query Radix entity state | [radix-Gateway](./context/radix-Gateway.md#service-catalog) | [Usage Patterns](./context/radix-Gateway.md#usage-patterns) |
| Read Radix KV store | [radix-Gateway](./context/radix-Gateway.md#usage-patterns) | [Pagination](./context/radix-Gateway.md#pagination--batching) |
| Parse Radix component state | [radix-Gateway](./context/radix-Gateway.md#usage-patterns) | [SBOR Schema](./context/radix-Gateway.md#sbor-schema) |
| Handle Gateway rate limits | [radix-Gateway](./context/radix-Gateway.md#error-handling) | [Error Types](./context/radix-Gateway.md#error-types) |
| Verify ROLA proof | [radix-Gateway](./context/radix-Gateway.md#usage-patterns) | [Configuration](./context/radix-Gateway.md#configuration) |
| Compose Effect operations | [effect-Pipe](./context/effect-Pipe.md#standalone-vs-method-pipe) | [Patterns by Domain](./context/effect-Pipe.md#pipe-patterns-by-domain) |
| Choose pipe vs gen vs fn | [effect-Pipe](./context/effect-Pipe.md#pipe-vs-effectgen-vs-effectfn) | [Decision Table](./context/effect-Pipe.md#decision-table) |
| Transform plain values | [effect-Pipe](./context/effect-Pipe.md#pure-value-pipelines-either-chain) | [flow vs pipe](./context/effect-Pipe.md#flow-vs-pipe) |


---

## Project Notes

### apps/consultation
- **State Management**: Uses `@effect-atom/atom-react` (NOT Jotai)
- **Framework**: TanStack Start

### Adding Context

To add a new context file:
1. Create markdown file in `./context/`
2. Add entry to this index with section-level links
3. Include in cross-reference table if applicable
