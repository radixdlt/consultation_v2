# @effect/cluster — Distributed Actor System for Effect

## Overview

`@effect/cluster` provides a **distributed entity (virtual actor) system** built on Effect. Entities are persistent, sharded, RPC-based actors that can be addressed by type + ID from anywhere in the cluster.

Key properties:
- **RPC-based** — entities define their messaging protocol via `RpcGroup`, giving full type-safe communication
- **Sharded** — entities are partitioned across runners via consistent hashing (`HashRing`), with automatic rebalancing
- **Persistent messaging** — messages can be persisted to SQL storage for durability and at-most-once delivery
- **Snowflake IDs** — globally unique, time-ordered 64-bit identifiers (Twitter-style) for messages and replies
- **Composable** — higher-level abstractions (Singleton, Cron, Workflow) build on the entity primitive

**Source:** `.repos/effect/packages/cluster/src/`
**Peer deps:** `effect`, `@effect/platform`, `@effect/rpc`, `@effect/sql` (optional, for persistence)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Types](#core-types)
3. [Entity](#entity)
4. [ClusterSchema — Annotations](#clusterschema--annotations)
5. [Envelope & Message](#envelope--message)
6. [Reply](#reply)
7. [Sharding](#sharding)
8. [ShardingConfig](#shardingconfig)
9. [MessageStorage](#messagestorage)
10. [Runner & RunnerStorage](#runner--runnerstorage)
11. [RunnerHealth](#runnerhealth)
12. [Transport — HttpRunner & SocketRunner](#transport--httprunner--socketrunner)
13. [SingleRunner](#singlerunner)
14. [Singleton](#singleton)
15. [ClusterCron](#clustercron)
16. [EntityResource](#entityresource)
17. [EntityProxy](#entityproxy)
18. [ClusterWorkflowEngine](#clusterworkflowengine)
19. [ClusterMetrics](#clustermetrics)
20. [Error Types](#error-types)
21. [Testing](#testing)
22. [Common Mistakes](#common-mistakes)
23. [Quick Reference](#quick-reference)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                          User Code                                │
│  Entity.make("Counter", [Rpc...])  →  .toLayer(handlers)         │
│  entity.client  →  client("entity-123").Increment(payload)       │
└──────────────────────────┬────────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       Sharding          │  Context.Tag — coordination
              │  (shard assignment,     │  service
              │   entity registration,  │
              │   message routing)      │
              └──┬──────────┬───────────┘
                 │          │
    ┌────────────▼──┐  ┌───▼──────────────────┐
    │   Runners     │  │   MessageStorage      │
    │  (RPC transport│  │  (persistence layer)  │
    │   between      │  │  noop / memory / SQL  │
    │   nodes)       │  └───────────────────────┘
    └───────────────┘
                 │
    ┌────────────┼──────────────────────┐
    ▼            ▼                      ▼
 Entity      Singleton              ClusterCron
 (per-ID     (per-shard             (distributed
  actors)     tasks)                 cron jobs)
    │
    ├── EntityResource (long-lived resources via RcRef)
    ├── EntityProxy (RPC/HTTP gateway to entities)
    └── ClusterWorkflowEngine (@effect/workflow integration)
```

### Module Dependency Graph

```
Core Types: EntityId, EntityType, ShardId, EntityAddress, RunnerAddress, Snowflake
     │
     ▼
Envelope / Message / Reply ──── wire protocol
     │
     ▼
Entity ──────────────────────── central abstraction (RpcGroup-based)
     │
     ▼
Sharding ────────────────────── coordination service
     │
     ├── MessageStorage (noop / memory / SQL)
     ├── RunnerStorage (memory / SQL)
     ├── Runners (RPC transport)
     ├── RunnerHealth (noop / ping / k8s)
     │
     ▼
Higher-level:
  Singleton ─── per-shard tasks
  ClusterCron ─ distributed cron (uses Entity + Singleton)
  EntityResource ─ long-lived entity resources (RcRef)
  EntityProxy ──── RPC/HTTP gateway to entities
  ClusterWorkflowEngine ─ @effect/workflow bridge
```

---

## Core Types

### EntityId

```typescript
type EntityId = Brand.Branded<string, "@effect/cluster/EntityId">
```
A branded string that identifies a specific entity instance. Used for shard assignment via `hashString(entityId) % shardsPerGroup`.

### EntityType

```typescript
type EntityType = Brand.Branded<string, "@effect/cluster/EntityType">
```
A branded string identifying the entity class/kind. Used as a namespace for entity registration.

### ShardId

```typescript
class ShardId extends Schema.Class<ShardId>("@effect/cluster/ShardId")({
  group: Schema.String,    // shard group name (default: "default")
  id: Schema.Number        // shard number within group (1..shardsPerGroup)
})
```
Identifies a shard partition. Entities are assigned to shards, and shards are assigned to runners.

### EntityAddress

```typescript
class EntityAddress extends Schema.Class<EntityAddress>("@effect/cluster/EntityAddress")({
  entityType: EntityType,  // which entity kind
  entityId: EntityId,      // which instance
  shardId: ShardId         // which shard owns it
})
```
Full address for routing a message to a specific entity instance.

### RunnerAddress

```typescript
class RunnerAddress extends Schema.Class<RunnerAddress>("@effect/cluster/RunnerAddress")({
  host: Schema.String,
  port: Schema.Number
})
```
Network address of a runner node in the cluster.

### Snowflake

```typescript
type Snowflake = Brand.Branded<bigint, TypeId>

// Structure: [42 bits timestamp | 10 bits machineId | 12 bits sequence]
// Epoch: 2025-01-01T00:00:00Z
// Capacity: 4096 IDs per millisecond per machine
```
Twitter-style distributed unique ID. Used for request IDs, reply IDs, and message ordering.

**Generator:**
```typescript
class Generator extends Context.Tag("@effect/cluster/Snowflake/Generator")<
  Generator, Snowflake.Generator
>() {}

// Usage:
const gen = yield* Snowflake.Generator
const id = gen.unsafeNext()

// Extract parts:
Snowflake.timestamp(id)  // → unix millis
Snowflake.machineId(id)  // → 0..1023
Snowflake.sequence(id)   // → 0..4095
```

### MachineId

```typescript
type MachineId = Brand.Branded<number, "@effect/cluster/MachineId">
// 10-bit value (0..1023), assigned by RunnerStorage on registration
```

---

## Entity

The central abstraction. An entity is a named, RPC-typed, sharded actor.

### Type Signature

```typescript
interface Entity<Type extends string, Rpcs extends Rpc.Any> extends Equal.Equal {
  readonly type: Type & Brand<"EntityType">
  readonly protocol: RpcGroup.RpcGroup<Rpcs>

  // Shard routing
  getShardGroup(entityId: EntityId): string
  getShardId(entityId: EntityId): Effect<ShardId, never, Sharding>

  // Annotations
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): Entity<Type, Rpcs>
  annotateRpcs<I, S>(tag: Context.Tag<I, S>, value: S): Entity<Type, Rpcs>
  annotateContext<S>(context: Context.Context<S>): Entity<Type, Rpcs>
  annotateRpcsContext<S>(context: Context.Context<S>): Entity<Type, Rpcs>

  // Client — obtain a typed client for sending messages
  readonly client: Effect<
    (entityId: string) => RpcClient.From<Rpcs, MailboxFull | AlreadyProcessingMessage | PersistenceError>,
    never,
    Sharding
  >

  // Registration — create a layer that registers this entity with Sharding
  toLayer(build, options?): Layer<never, never, Sharding | ...>
  toLayerMailbox(build, options?): Layer<never, never, Sharding | ...>
  of(handlers): Handlers  // identity helper for type inference

  // Testing
  // (see Entity.makeTestClient below)
}
```

### Constructors

```typescript
// From an array of Rpc definitions:
const Counter = Entity.make("Counter", [
  Rpc.make("Increment", {
    payload: { amount: Schema.Number },
    success: Schema.Number,
    primaryKey: ({ amount }) => "singleton"  // for idempotent messages
  }),
  Rpc.make("GetCount", {
    success: Schema.Number
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

// From an existing RpcGroup:
const Counter = Entity.fromRpcGroup("Counter", myRpcGroup)
```

### `toLayer` — Register Entity Handlers

```typescript
const CounterLayer = Counter.toLayer(
  // Handlers: static object or Effect<Handlers>
  Effect.gen(function*() {
    let count = 0
    return {
      Increment: (envelope) => Effect.sync(() => { count += envelope.payload.amount; return count }),
      GetCount: () => Effect.sync(() => count)
    }
  }),
  {
    maxIdleTime: "5 minutes",         // entity idle timeout (default: from config)
    concurrency: 1,                    // message processing concurrency (default: 1)
    mailboxCapacity: 4096,             // mailbox buffer size (default: from config)
    disableFatalDefects: false,        // if true, defects don't crash the entity
    defectRetryPolicy: Schedule.forever, // retry policy after defects
    spanAttributes: { ... }            // tracing attributes
  }
)
```

**Handler signature:** Each handler receives an `Entity.Request<Rpc>` (an envelope wrapping the Rpc payload). For streaming RPCs, return a `Stream` or `Mailbox`.

### `toLayerMailbox` — Mailbox-Based Handler

For manual message processing with a mailbox:

```typescript
const CounterLayer = Counter.toLayerMailbox(
  (mailbox, replier) => Effect.gen(function*() {
    let count = 0
    while (true) {
      const request = yield* mailbox.take
      if (request.tag === "Increment") {
        count += request.payload.amount
        yield* replier.succeed(request, count)
      } else if (request.tag === "GetCount") {
        yield* replier.succeed(request, count)
      }
    }
  })
)
```

The `Replier` interface:
```typescript
interface Replier<Rpcs> {
  succeed(request, value): Effect<void>
  fail(request, error): Effect<void>
  failCause(request, cause): Effect<void>
  complete(request, exit): Effect<void>
}
```

### `client` — Send Messages to Entities

```typescript
const program = Effect.gen(function*() {
  const makeClient = yield* Counter.client
  const client = makeClient("counter-123")

  const count = yield* client.Increment({ amount: 5 })
  const current = yield* client.GetCount({})

  // Discard mode — fire-and-forget, returns void:
  yield* client.Increment({ amount: 1 }, { discard: true })
})
```

### `makeTestClient` — Testing Without Full Cluster

```typescript
const makeClient = yield* Entity.makeTestClient(
  Counter,
  CounterLayer  // the entity layer to test
)
// Returns: (entityId: string) => Effect<RpcClient<Rpcs>>

const client = yield* makeClient("test-entity-1")
const result = yield* client.Increment({ amount: 5 })
```

Internally creates a mock `Sharding`, in-process `RpcServer`/`RpcClient` pair, and wires them together — no real network.

### Keep-Alive Mechanism

```typescript
// Inside entity handler, prevent idle timeout:
yield* Entity.keepAlive(true)

// Re-enable idle timeout:
yield* Entity.keepAlive(false)
```

Uses an internal `KeepAliveRpc` (persisted, uninterruptible) to keep the entity alive.

### Context Tags

```typescript
Entity.CurrentAddress    // EntityAddress of the current entity
Entity.CurrentRunnerAddress // RunnerAddress of the current runner
```

---

## ClusterSchema — Annotations

Annotations on `Rpc` definitions that control cluster behavior:

```typescript
// Persist messages to MessageStorage (default: false)
ClusterSchema.Persisted    // Context.Reference<boolean>

// Make Rpc uninterruptible (default: false)
// - true: both client and server are uninterruptible
// - "client": only client-side interrupts are ignored
// - "server": only server-side interrupts are ignored
ClusterSchema.Uninterruptible  // Context.Reference<boolean | "client" | "server">

// Custom shard group routing (default: () => "default")
ClusterSchema.ShardGroup   // Context.Reference<(entityId: EntityId) => string>

// Enable/disable client-side tracing (default: true)
ClusterSchema.ClientTracingEnabled  // Context.Reference<boolean>
```

**Usage:**
```typescript
Rpc.make("MyRpc", { ... })
  .annotate(ClusterSchema.Persisted, true)
  .annotate(ClusterSchema.Uninterruptible, true)
```

---

## Envelope & Message

### Envelope — Wire Protocol

Three envelope variants:

```typescript
type Envelope<R> = Request<R> | AckChunk | Interrupt

// Request — initial message to an entity
interface Request<Rpc> {
  _tag: "Request"
  requestId: Snowflake        // unique ID
  address: EntityAddress       // target entity
  tag: string                  // Rpc tag name
  payload: Rpc.Payload<Rpc>   // typed payload
  headers: Headers             // HTTP-style headers
  traceId?: string             // distributed tracing
  spanId?: string
  sampled?: boolean
}

// AckChunk — acknowledge receipt of a streaming chunk
class AckChunk extends Schema.TaggedClass { requestId, replyId, address }

// Interrupt — cancel a running request
class Interrupt extends Schema.TaggedClass { requestId, address }
```

### PrimaryKey — Idempotency

If an Rpc payload implements `PrimaryKey.symbol`, the envelope gets a `primaryKey`:
```
primaryKey = "{entityType}/{entityId}/{rpcTag}/{PrimaryKey.value(payload)}"
```
On `saveRequest`, if a message with the same `primaryKey` exists, it returns `SaveResult.Duplicate` with the original reply — enabling **at-most-once semantics**.

### Message — Internal Wrappers

```typescript
// Outgoing (from client to entity):
class OutgoingRequest<R> { envelope, rpc, context, respond, lastReceivedReply }
class OutgoingEnvelope { envelope, rpc }

// Incoming (from storage/network to entity handler):
class IncomingRequest<R> { envelope, lastSentReply, respond }
class IncomingEnvelope { envelope }
```

---

## Reply

Two reply variants:

```typescript
type Reply<R> = WithExit<R> | Chunk<R>

// Final reply — completes the request
class WithExit<R> {
  _tag: "WithExit"
  requestId: Snowflake
  id: Snowflake
  exit: Rpc.Exit<R>              // Exit<Success, Error>
}

// Streaming chunk — partial result
class Chunk<R> {
  _tag: "Chunk"
  requestId: Snowflake
  id: Snowflake
  sequence: number               // for ordering
  values: NonEmptyReadonlyArray<Rpc.SuccessChunk<R>>
}
```

`ReplyWithContext<R>` wraps a reply with the Rpc definition and service context for serialization.

---

## Sharding

The core coordination service. All entity operations flow through it.

```typescript
class Sharding extends Context.Tag("@effect/cluster/Sharding")<Sharding, {
  // Stream of entity/singleton registration events
  readonly getRegistrationEvents: Stream<ShardingRegistrationEvent>

  // Compute shard for an entity ID
  readonly getShardId: (entityId: EntityId, group: string) => ShardId

  // Check if shard is owned by this runner
  readonly hasShardId: (shardId: ShardId) => boolean

  // Generate a cluster-unique Snowflake ID
  readonly getSnowflake: Effect<Snowflake>

  // Check shutdown state
  readonly isShutdown: Effect<boolean>

  // Get a typed client for an entity
  readonly makeClient: <Type, Rpcs>(entity) => Effect<(entityId) => RpcClient>

  // Register an entity type with the runner
  readonly registerEntity: (entity, handlers, options?) => Effect<void, never, Scope | ...>

  // Register a singleton task
  readonly registerSingleton: (name, run, options?) => Effect<void, never, R | Scope>

  // Send a message to a local entity
  readonly send: (message) => Effect<void, EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage>

  // Send an outgoing message (routes to local or remote)
  readonly sendOutgoing: (message, discard) => Effect<void, MailboxFull | AlreadyProcessingMessage | PersistenceError>

  // Notify that a message has been persisted
  readonly notify: (message, options?) => Effect<void, ...>

  // Reset a request (clear replies)
  readonly reset: (requestId) => Effect<boolean>

  // Trigger a storage read
  readonly pollStorage: Effect<void>

  // Count active entities on this runner
  readonly activeEntityCount: Effect<number>
}>() {}
```

### Layer

```typescript
Sharding.layer: Layer<
  Sharding,
  never,
  ShardingConfig | Runners | MessageStorage | RunnerStorage | RunnerHealth
>
```

### Shard Assignment

1. Runners register with `RunnerStorage`
2. `RunnerStorage.getRunners` returns all runners + health status
3. Healthy runners are added to `HashRing` per shard group
4. `HashRing.getShards(ring, shardsPerGroup)` distributes shards across runners
5. Each runner acquires locks for its assigned shards
6. Messages are routed: `entityId → shardId → runnerAddress → local/remote send`

---

## ShardingConfig

```typescript
class ShardingConfig extends Context.Tag("@effect/cluster/ShardingConfig")<ShardingConfig, {
  runnerAddress: Option<RunnerAddress>      // None = client-only mode
  runnerListenAddress: Option<RunnerAddress> // defaults to runnerAddress
  runnerShardWeight: number                 // default: 1
  shardGroups: ReadonlyArray<string>        // default: ["default"]
  shardsPerGroup: number                    // default: 300
  preemptiveShutdown: boolean               // default: true
  shardLockRefreshInterval: DurationInput   // default: 10s
  shardLockExpiration: DurationInput        // default: 35s
  shardLockDisableAdvisory: boolean         // default: false
  entityMailboxCapacity: number | "unbounded" // default: 4096
  entityMaxIdleTime: DurationInput          // default: 1min
  entityRegistrationTimeout: DurationInput  // default: 1min
  entityTerminationTimeout: DurationInput   // default: 15s
  entityMessagePollInterval: DurationInput  // default: 10s
  entityReplyPollInterval: DurationInput    // default: 200ms
  refreshAssignmentsInterval: DurationInput // default: 3s
  sendRetryInterval: DurationInput          // default: 100ms
  runnerHealthCheckInterval: DurationInput  // default: 1min
  simulateRemoteSerialization: boolean      // default: true
}>() {}
```

### Constructors

```typescript
// Direct config:
ShardingConfig.layer({ shardsPerGroup: 100 })

// Defaults:
ShardingConfig.layerDefaults

// From environment variables (CONSTANT_CASE):
ShardingConfig.layerFromEnv()
ShardingConfig.layerFromEnv({ shardsPerGroup: 100 })  // with overrides
```

Environment variables: `HOST`, `PORT`, `SHARDS_PER_GROUP`, `ENTITY_MAX_IDLE_TIME`, etc.

---

## MessageStorage

Abstract persistence layer for messages and replies.

```typescript
class MessageStorage extends Context.Tag("@effect/cluster/MessageStorage")<MessageStorage, {
  saveRequest(envelope): Effect<SaveResult, PersistenceError | MalformedMessage>
  saveEnvelope(envelope): Effect<void, PersistenceError | MalformedMessage>
  saveReply(reply): Effect<void, PersistenceError | MalformedMessage>
  clearReplies(requestId): Effect<void, PersistenceError>
  repliesFor(requests): Effect<Array<Reply>, PersistenceError | MalformedMessage>
  requestIdForPrimaryKey(options): Effect<Option<Snowflake>, PersistenceError>
  unprocessedMessages(shardIds): Effect<Array<Message.Incoming>, PersistenceError>
  resetShards(shardIds): Effect<void, PersistenceError>
  clearAddress(address): Effect<void, PersistenceError>
  // ... (register/unregister reply handlers)
}>() {}
```

### SaveResult — Idempotency

```typescript
type SaveResult<R> = SaveResult.Success | SaveResult.Duplicate<R>

SaveResult.Success()                    // message saved successfully
SaveResult.Duplicate({ originalId, lastReceivedReply })  // duplicate primaryKey
```

### Layers

```typescript
// No-op (in-memory, non-persistent):
MessageStorage.layerNoop

// In-memory with full behavior:
MessageStorage.layerMemory  // → MessageStorage | MemoryDriver

// SQL-backed (Postgres, MySQL, SQLite):
SqlMessageStorage.layer     // → MessageStorage (requires SqlClient)
```

### Building Custom Storage

```typescript
// From raw encoded interface:
const storage = yield* MessageStorage.makeEncoded({
  saveEnvelope: (options) => ...,
  saveReply: (reply) => ...,
  unprocessedMessages: (shardIds, now) => ...,
  // ... all Encoded methods
})
```

---

## Runner & RunnerStorage

### Runner

```typescript
class Runner extends Schema.Class("@effect/cluster/Runner")({
  address: RunnerAddress,
  groups: Schema.Array(Schema.String),    // shard groups this runner handles
  weight: Schema.Number                   // relative shard weight
})
```

### RunnerStorage

Abstract interface for runner registration and shard locking:

```typescript
class RunnerStorage extends Context.Tag("@effect/cluster/RunnerStorage")<RunnerStorage, {
  register(runner, force?): Effect<MachineId, PersistenceError>
  unregister(address): Effect<void, PersistenceError>
  getRunners: Effect<Array<[Runner, boolean]>, PersistenceError>  // runner + healthy flag
  acquire(address, shardIds): Effect<Array<ShardId>, PersistenceError>
  release(address, shardId): Effect<void, PersistenceError>
  releaseAll(address): Effect<void, PersistenceError>
  refresh(address, shardIds): Effect<Array<ShardId>, PersistenceError>
  setRunnerHealth(address, healthy): Effect<void, PersistenceError>
}>() {}
```

**Layers:**
```typescript
RunnerStorage.layerMemory  // in-memory (testing)
SqlRunnerStorage.layer     // SQL-backed (requires SqlClient)
```

---

## RunnerHealth

Service for checking if runners are alive:

```typescript
class RunnerHealth extends Context.Tag("@effect/cluster/RunnerHealth")<RunnerHealth, {
  readonly isAlive: (address: RunnerAddress) => Effect<boolean>
}>() {}
```

**Layers:**
```typescript
RunnerHealth.layerNoop    // always returns true (testing)
RunnerHealth.layerPing    // pings the runner via Runners service
RunnerHealth.layerK8s()   // checks Kubernetes pod status
```

---

## Transport — HttpRunner & SocketRunner

### HttpRunner

Layers for HTTP-based runner communication:

```typescript
// Full runner (server + client):
HttpRunner.layerHttp           // HTTP transport
HttpRunner.layerWebsocket      // WebSocket transport

// Client-only (no server, for sending messages to remote entities):
HttpRunner.layerHttpClientOnly
HttpRunner.layerWebsocketClientOnly

// Custom path:
HttpRunner.layerHttpOptions({ path: "/cluster" })
HttpRunner.layerWebsocketOptions({ path: "/cluster" })

// Client protocol (how to connect to other runners):
HttpRunner.layerClientProtocolHttp({ path: "/", https: false })
HttpRunner.layerClientProtocolWebsocket({ path: "/", https: false })
```

### SocketRunner

```typescript
SocketRunner.layerHttp        // Socket.io-style transport
SocketRunner.layerWebsocket   // WebSocket transport
```

---

## SingleRunner

All-in-one SQL-backed single-node cluster — for when you need durable entities/workflows without multi-node distribution:

```typescript
SingleRunner.layer({
  shardingConfig: { shardsPerGroup: 100 },
  runnerStorage: "memory"   // or "sql"
}): Layer<
  Sharding | Runners | MessageStorage,
  ConfigError,
  SqlClient
>
```

Internally composes: `Sharding.layer` + `Runners.layerNoop` + `SqlMessageStorage` + `RunnerHealth.layerNoop` + `ShardingConfig.layerFromEnv`.

---

## Singleton

Per-shard singleton tasks. Only runs on the runner that owns the shard:

```typescript
const HealthCheckLayer = Singleton.make(
  "HealthCheck",
  Effect.gen(function*() {
    while (true) {
      yield* checkHealth()
      yield* Effect.sleep("30 seconds")
    }
  }),
  { shardGroup: "default" }  // optional
)
// Returns: Layer<never, never, Sharding | Exclude<R, Scope>>
```

Internally calls `sharding.registerSingleton(name, run, options)`. The Sharding service manages starting/stopping singletons as shards move between runners.

---

## ClusterCron

Distributed cron jobs using entities + singletons:

```typescript
const DailyReportLayer = ClusterCron.make({
  name: "DailyReport",
  cron: Cron.parse("0 9 * * *"),          // 9am daily
  execute: generateDailyReport(),
  shardGroup: "default",                   // optional
  calculateNextRunFromPrevious: false,     // default: false
  skipIfOlderThan: "1 day"                // default: "1 day"
})
// Returns: Layer<never, never, Sharding | Exclude<R, Scope>>
```

**How it works:**
1. Creates an entity `ClusterCron/{name}` with a single `run` Rpc (persisted, uninterruptible)
2. Creates a singleton `ClusterCron/{name}` that sends the initial run message
3. Each run schedules the next run via `DeliverAt` (deferred delivery timestamp)
4. Uses `PrimaryKey` for idempotent scheduling

---

## EntityResource

Long-lived resources tied to an entity, surviving restarts (shard movement, node shutdown):

```typescript
const resource = yield* EntityResource.make({
  acquire: Effect.gen(function*() {
    const db = yield* connectToDatabase()
    return db
  }),
  idleTimeToLive: "10 minutes"   // default: infinity
})

// Use the resource (acquires a Scope):
const db = yield* resource.get

// Explicitly release:
yield* resource.close
```

Internally uses `RcRef` and `Entity.keepAlive(true)` to prevent the entity from being reaped while the resource is active.

### CloseScope

A `Context.Tag` providing a `Scope` that is only closed on explicit `resource.close`, NOT on entity restarts:

```typescript
class CloseScope extends Context.Tag("@effect/cluster/EntityResource/CloseScope")<
  CloseScope, Scope.Scope
>() {}
```

### Kubernetes Integration

```typescript
const pod = yield* EntityResource.makeK8sPod(podSpec, {
  idleTimeToLive: "30 minutes"
})
```

---

## EntityProxy

Derives RPC groups or HTTP API groups from entity definitions — creates a gateway for external clients:

### `toRpcGroup` — RPC Gateway

```typescript
// For each entity Rpc "Increment", generates:
//   "Counter.Increment"        — execute (payload: { entityId, payload })
//   "Counter.IncrementDiscard" — fire-and-forget
class MyRpcs extends EntityProxy.toRpcGroup(Counter) {}

// Server layer:
const RpcServerLayer = RpcServer.layer(MyRpcs).pipe(
  Layer.provide(EntityProxyServer.layerRpcHandlers(Counter))
)
```

### `toHttpApiGroup` — HTTP Gateway

```typescript
// For each entity Rpc "Increment", generates:
//   POST /increment/:entityId          — execute
//   POST /increment/:entityId/discard  — fire-and-forget
const api = EntityProxy.toHttpApiGroup("counter", Counter)

// Server layer:
const ApiLayer = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide(EntityProxyServer.layerHttpApi(MyApi, "counter", Counter))
)
```

---

## ClusterWorkflowEngine

Bridges `@effect/workflow` with `@effect/cluster`. Workflows become durable, persisted entities.

```typescript
// Layer:
ClusterWorkflowEngine.layer: Layer<
  WorkflowEngine,
  never,
  Sharding | MessageStorage
>
```

**How it works:**
- Each workflow becomes an entity `Workflow/{name}` with RPCs: `run`, `activity`, `deferred`, `resume`
- Activities execute as separate entity requests with `PrimaryKey`-based idempotency
- Durable clocks use a `Workflow/-/DurableClock` entity with `DeliverAt` timestamps
- Workflow suspend/resume maps to entity message persistence

**Usage:**
```typescript
const TestEnv = Layer.mergeAll(
  MyWorkflowLayer,
  ClusterWorkflowEngine.layer
).pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provideMerge(/* storage, runners, etc. */)
)
```

---

## ClusterMetrics

Gauge metrics for observability:

```typescript
ClusterMetrics.entities        // "effect_cluster_entities" — active entity count
ClusterMetrics.singletons      // "effect_cluster_singletons" — running singleton count
ClusterMetrics.runners         // "effect_cluster_runners" — registered runner count
ClusterMetrics.runnersHealthy  // "effect_cluster_runners_healthy" — healthy runner count
ClusterMetrics.shards          // "effect_cluster_shards" — acquired shard count
```

All are `Metric.gauge` with `bigint: true`.

---

## Error Types

All error types extend `Schema.TaggedError` and carry `ClusterError.TypeId`:

| Error | Description |
|-------|-------------|
| `EntityNotAssignedToRunner` | Message sent to entity not on this runner's shards |
| `MailboxFull` | Entity's mailbox capacity exceeded |
| `AlreadyProcessingMessage` | Duplicate message already being processed |
| `PersistenceError` | Storage operation failed |
| `MalformedMessage` | Message deserialization failed |
| `RunnerNotRegistered` | Runner not found in RunnerStorage |
| `RunnerUnavailable` | Runner is unresponsive |

```typescript
// All errors have .is() static method:
ClusterError.MailboxFull.is(error)  // type guard

// PersistenceError wraps any cause:
PersistenceError.refail(someEffect)  // maps all errors to PersistenceError
```

---

## Testing

### TestRunner — In-Memory Cluster

```typescript
import { TestRunner } from "@effect/cluster"

TestRunner.layer: Layer<
  Sharding | Runners | MessageStorage | MemoryDriver
>
```

Composes: `Sharding.layer` + `Runners.layerNoop` + `MessageStorage.layerMemory` + `RunnerStorage.layerMemory` + `RunnerHealth.layerNoop` + `ShardingConfig.layer()`.

### Entity.makeTestClient — Unit Testing

```typescript
import { describe, it } from "@effect/vitest"

it.effect("entity processes messages", () =>
  Effect.gen(function*() {
    const makeClient = yield* Entity.makeTestClient(Counter, CounterLayer)
    const client = yield* makeClient("counter-1")

    const result = yield* client.Increment({ amount: 5 })
    expect(result).toBe(5)
  }).pipe(
    Effect.provide(ShardingConfig.layerDefaults)
  )
)
```

### Full Cluster Test Layer

```typescript
const TestEnv = CounterLayer.pipe(
  Layer.provideMerge(TestRunner.layer)
)

it.effect("counter increments", () =>
  Effect.gen(function*() {
    const makeClient = yield* Counter.client
    const client = makeClient("counter-1")
    yield* client.Increment({ amount: 3 })
    const count = yield* client.GetCount({})
    expect(count).toBe(3)
  }).pipe(
    Effect.provide(TestEnv)
  )
)
```

### Test Entity Pattern (from test suite)

```typescript
const TestEntity = Entity.make("TestEntity", [
  Rpc.make("GetUser", {
    success: User,
    payload: { id: Schema.Number }
  }),
  Rpc.make("RequestWithKey", {
    payload: { key: Schema.String },
    primaryKey: ({ key }) => key   // idempotent
  }),
  Rpc.make("GetAllUsers", {
    success: User,
    payload: { ids: Schema.Array(Schema.Number) },
    stream: true                    // streaming response
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

// Layer with state tracking:
const TestEntityLayer = TestEntity.toLayer(
  Effect.gen(function*() {
    return {
      GetUser: (envelope) => Effect.succeed(
        new User({ id: envelope.payload.id, name: `User ${envelope.payload.id}` })
      ),
      RequestWithKey: (envelope) => Effect.void,
      GetAllUsers: (envelope) => Stream.fromIterable(
        envelope.payload.ids.map(id => new User({ id, name: `User ${id}` }))
      )
    }
  }),
  { defectRetryPolicy: Schedule.forever }
)
```

---

## Common Mistakes

### 1. Forgetting `annotateRpcs(Persisted, true)` for Durable Messages

```typescript
// ❌ Messages are volatile — lost on restart
const MyEntity = Entity.make("MyEntity", [
  Rpc.make("Important", { ... })
])

// ✅ Messages persist to storage
const MyEntity = Entity.make("MyEntity", [
  Rpc.make("Important", { ... })
]).annotateRpcs(ClusterSchema.Persisted, true)
```

### 2. Non-Unique Entity Type Names

```typescript
// ❌ Two entities with same type — second registration is silently ignored
Entity.make("Counter", [...])
Entity.make("Counter", [...])  // won't register!

// ✅ Unique type names per entity
Entity.make("OrderCounter", [...])
Entity.make("UserCounter", [...])
```

### 3. Missing PrimaryKey for Idempotency

```typescript
// ❌ No primaryKey — duplicate sends create duplicate processing
Rpc.make("ProcessPayment", {
  payload: { orderId: Schema.String, amount: Schema.Number }
})

// ✅ With primaryKey — duplicate sends return cached result
Rpc.make("ProcessPayment", {
  payload: { orderId: Schema.String, amount: Schema.Number },
  primaryKey: ({ orderId }) => orderId
})
```

### 4. Not Providing MessageStorage for Persisted Entities

```typescript
// ❌ Dies at runtime: "Persisted messages require MessageStorage"
Effect.provide(program, Sharding.layer.pipe(
  Layer.provide(MessageStorage.layerNoop)  // noop doesn't persist!
))

// ✅ Use memory or SQL storage
Effect.provide(program, Sharding.layer.pipe(
  Layer.provide(MessageStorage.layerMemory)  // or SqlMessageStorage.layer
))
```

### 5. Assuming Entity State Survives Restarts

```typescript
// ❌ State is lost when entity is reaped or shard moves
const Layer = Counter.toLayer(Effect.gen(function*() {
  let count = 0  // volatile!
  return { Increment: (e) => Effect.sync(() => ++count) }
}))

// ✅ Use MessageStorage + PrimaryKey for durable state
// Or use @effect/workflow for durable computations
```

---

## Quick Reference

### Module Exports

| Module | Key Exports |
|--------|-------------|
| `Entity` | `make`, `fromRpcGroup`, `makeTestClient`, `keepAlive`, `CurrentAddress`, `CurrentRunnerAddress`, `Request`, `Replier`, `KeepAliveRpc` |
| `ClusterSchema` | `Persisted`, `Uninterruptible`, `ShardGroup`, `ClientTracingEnabled` |
| `Envelope` | `Request`, `AckChunk`, `Interrupt`, `makeRequest`, `primaryKey` |
| `Message` | `OutgoingRequest`, `OutgoingEnvelope`, `IncomingRequest`, `IncomingEnvelope` |
| `Reply` | `WithExit`, `Chunk`, `ReplyWithContext`, `Reply` (schema), `serialize` |
| `Sharding` | `Sharding` (Context.Tag), `layer` |
| `ShardingConfig` | `ShardingConfig` (Context.Tag), `defaults`, `layer`, `layerDefaults`, `layerFromEnv`, `config`, `configFromEnv` |
| `MessageStorage` | `MessageStorage` (Context.Tag), `make`, `makeEncoded`, `noop`, `MemoryDriver`, `layerNoop`, `layerMemory`, `SaveResult` |
| `SqlMessageStorage` | `layer` |
| `Runner` | `Runner` (Schema.Class), `make` |
| `RunnerStorage` | `RunnerStorage` (Context.Tag), `layerMemory` |
| `SqlRunnerStorage` | `layer` |
| `RunnerHealth` | `RunnerHealth` (Context.Tag), `layerNoop`, `layerPing`, `layerK8s`, `makePing`, `makeK8s` |
| `Runners` | `Runners` (Context.Tag), `Rpcs`, `RpcClientProtocol`, `layerNoop`, `layerRpc` |
| `HttpRunner` | `layerHttp`, `layerWebsocket`, `layerHttpClientOnly`, `layerWebsocketClientOnly`, `layerHttpOptions`, `layerWebsocketOptions`, `layerClientProtocolHttp`, `layerClientProtocolWebsocket`, `toHttpEffect` |
| `SocketRunner` | `layerHttp`, `layerWebsocket` |
| `SingleRunner` | `layer` |
| `Singleton` | `make` |
| `ClusterCron` | `make` |
| `EntityResource` | `make`, `makeK8sPod`, `CloseScope` |
| `EntityProxy` | `toRpcGroup`, `toHttpApiGroup` |
| `EntityProxyServer` | `layerRpcHandlers`, `layerHttpApi` |
| `ClusterWorkflowEngine` | `make`, `layer` |
| `ClusterMetrics` | `entities`, `singletons`, `runners`, `runnersHealthy`, `shards` |
| `ClusterError` | `EntityNotAssignedToRunner`, `MailboxFull`, `AlreadyProcessingMessage`, `PersistenceError`, `MalformedMessage`, `RunnerNotRegistered`, `RunnerUnavailable` |
| `TestRunner` | `layer` |
| `Snowflake` | `Snowflake`, `make`, `timestamp`, `machineId`, `sequence`, `toParts`, `Generator`, `layerGenerator`, `SnowflakeFromString`, `SnowflakeFromBigInt` |

### Context.Tag Services

| Tag | Purpose |
|-----|---------|
| `Sharding` | Core coordination — entity/singleton registration, message routing |
| `ShardingConfig` | Cluster configuration |
| `MessageStorage` | Message persistence |
| `RunnerStorage` | Runner registration and shard locking |
| `RunnerHealth` | Runner health checking |
| `Runners` | Inter-runner RPC transport |
| `Snowflake.Generator` | Unique ID generation |
| `Entity.CurrentAddress` | Current entity's address (inside handlers) |
| `Entity.CurrentRunnerAddress` | Current runner's address (inside handlers) |
| `EntityResource.CloseScope` | Scope for entity resource cleanup |

### Config Defaults

| Setting | Default |
|---------|---------|
| `runnerAddress` | `localhost:34431` |
| `runnerShardWeight` | `1` |
| `shardsPerGroup` | `300` |
| `shardGroups` | `["default"]` |
| `preemptiveShutdown` | `true` |
| `shardLockRefreshInterval` | `10 seconds` |
| `shardLockExpiration` | `35 seconds` |
| `entityMailboxCapacity` | `4096` |
| `entityMaxIdleTime` | `1 minute` |
| `entityRegistrationTimeout` | `1 minute` |
| `entityTerminationTimeout` | `15 seconds` |
| `entityMessagePollInterval` | `10 seconds` |
| `entityReplyPollInterval` | `200ms` |
| `refreshAssignmentsInterval` | `3 seconds` |
| `sendRetryInterval` | `100ms` |
| `runnerHealthCheckInterval` | `1 minute` |
| `simulateRemoteSerialization` | `true` |
