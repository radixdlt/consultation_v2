# Agent Context Hub

Central index of context files for AI agents and coding assistants working with this codebase.

## Quick Reference

| Context File | Domain | Key Concepts |
|--------------|--------|--------------|
| [effect-Context](./context/effect-Context.md) | Dependency Injection | Context.Tag, Effect.Service, Layers |
| [effect-Layer](./context/effect-Layer.md) | Layer Composition | Constructors, provide/provideMerge/merge, MemoMap, Scope |
| [effect-Schema](./context/effect-Schema.md) | Validation | Schema types, transforms, refinements |
| [effect-Queue](./context/effect-Queue.md) | Concurrency | Fiber-safe queues, backpressure, producer/consumer |
| [effect-Pipe](./context/effect-Pipe.md) | Composition | Standalone pipe, .pipe() method, flow, Pipeable |
| [effect-Platform](./context/effect-Platform.md) | Platform Services | HTTP client/server, FileSystem, Terminal, Workers, Sockets |
| [effect-Rpc](./context/effect-Rpc.md) | RPC Framework | Type-safe RPC, streaming, middleware, WebSocket/HTTP/Worker |
| [effect-atom](./context/effect-atom.md) | State Management | Reactive atoms, Result type, React hooks |
| [sql-drizzle](./context/sql-drizzle.md) | Database ORM | Drizzle + Effect, remote proxy, transactions |
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

## Effect Layer

> Composable, memoized blueprints for building service dependency graphs

**File:** [effect-Layer.md](./context/effect-Layer.md)

| Section | Description |
|---------|-------------|
| [Type Signature & Variance](./context/effect-Layer.md#type-signature--variance) | `Layer<ROut, E, RIn>` — contravariant output, covariant error/input |
| [Constructors](./context/effect-Layer.md#constructors) | succeed, effect, scoped, function, suspend, context, empty, fail |
| [Composition: The Four Key Operations](./context/effect-Layer.md#composition-the-four-key-operations) | provide, provideMerge, merge, mergeAll |
| [Internal Architecture](./context/effect-Layer.md#internal-architecture) | How layers build context at runtime |
| [MemoMap: Automatic Sharing](./context/effect-Layer.md#memomap-automatic-sharing) | Single-initialization guarantee per program |
| [Scope Hierarchy & Parallel Execution](./context/effect-Layer.md#scope-hierarchy--parallel-execution) | Parent/child scopes, parallel layer construction |
| [Error Handling](./context/effect-Layer.md#error-handling) | Layer errors, catchAll, tapError, orElse, retry |
| [fresh() — Bypassing Memoization](./context/effect-Layer.md#fresh--bypassing-memoization) | When to skip memo sharing |
| [Codebase Patterns](./context/effect-Layer.md#codebase-patterns) | Real patterns from this project |
| [Common Mistakes & Gotchas](./context/effect-Layer.md#common-mistakes--gotchas) | provide vs provideMerge, layer order, circular deps |
| [Quick Reference](./context/effect-Layer.md#quick-reference) | Constructor, composition, error handling cheatsheets |

### Layer Subsections

| Topic | Section |
|-------|---------|
| Variance rules (why wider output = subtype) | [Variance explained](./context/effect-Layer.md#variance-explained) |
| provide vs provideMerge vs merge | [Composition: The Four Key Operations](./context/effect-Layer.md#composition-the-four-key-operations) |
| MemoMap single-init guarantee | [MemoMap: Automatic Sharing](./context/effect-Layer.md#memomap-automatic-sharing) |
| Scope lifecycle & finalizers | [Scope Hierarchy & Parallel Execution](./context/effect-Layer.md#scope-hierarchy--parallel-execution) |
| fresh() for test isolation | [fresh() — Bypassing Memoization](./context/effect-Layer.md#fresh--bypassing-memoization) |

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

## Effect Platform

> Unified, platform-independent abstractions for HTTP, filesystem, terminal, workers, and more

**File:** [effect-Platform.md](./context/effect-Platform.md)

| Section | Description |
|---------|-------------|
| [Package Overview](./context/effect-Platform.md#package-overview) | Dependencies, exports pattern, module organization |
| [Module Map](./context/effect-Platform.md#module-map) | 56 modules across 10 categories |
| [HTTP Client](./context/effect-Platform.md#http-client) | Service tag, verb shortcuts, middleware, retry |
| [HTTP Server](./context/effect-Platform.md#http-server) | Abstract server interface, serving patterns |
| [HTTP Router](./context/effect-Platform.md#http-router) | Radix-tree routing, verb combinators, composition |
| [Declarative HTTP API](./context/effect-Platform.md#declarative-http-api) | HttpApi/Group/Endpoint/Builder, schema-driven endpoints |
| [HTTP Request & Response](./context/effect-Platform.md#http-request--response-types) | Client/server request/response types |
| [HTTP Middleware](./context/effect-Platform.md#http-middleware) | Logger, CORS, tracer, x-forwarded headers |
| [FileSystem](./context/effect-Platform.md#filesystem) | Read/write/stream files, branded Size type |
| [Terminal](./context/effect-Platform.md#terminal) | Terminal I/O, readLine, QuitException |
| [KeyValueStore](./context/effect-Platform.md#keyvaluestore) | Key-value storage, SchemaStore, layerMemory/FileSystem |
| [Command & CommandExecutor](./context/effect-Platform.md#command--commandexecutor) | Process execution, piping, streaming |
| [Socket & SocketServer](./context/effect-Platform.md#socket--socketserver) | WebSocket support, channel conversion |
| [Worker & WorkerRunner](./context/effect-Platform.md#worker--workerrunner) | Worker pools, schema-based dispatch |
| [Error Model](./context/effect-Platform.md#error-model) | PlatformError, BadArgument, SystemError |
| [Key Patterns](./context/effect-Platform.md#key-patterns) | Service tags, Layer provision, branded types, Schema integration |
| [Architecture Flows](./context/effect-Platform.md#architecture-flows) | Client pipeline, server routing, declarative API flow |

### Platform Subsections

| Topic | Section |
|-------|---------|
| FetchHttpClient layer | [Fetch Implementation](./context/effect-Platform.md#fetch-implementation) |
| HTTP verb shortcuts | [Convenience Methods](./context/effect-Platform.md#convenience-methods) |
| Client middleware (map, transform) | [Client Middleware](./context/effect-Platform.md#client-middleware) |
| Retry & error handling | [Error Handling & Retry](./context/effect-Platform.md#error-handling--retry) |
| HttpRouter.Tag custom routers | [Custom Router Tags](./context/effect-Platform.md#custom-router-tags) |
| HttpApiEndpoint definition | [HttpApiEndpoint](./context/effect-Platform.md#httpapiendpoint-individual-endpoint) |
| HttpApiBuilder implementation | [HttpApiBuilder](./context/effect-Platform.md#httpapibuilder-implementation) |
| File stream/sink I/O | [Stream-based I/O](./context/effect-Platform.md#stream-based-io) |
| Command piping | [Command](./context/effect-Platform.md#command-functional-builder) |
| Worker pools (elastic) | [Worker Pools](./context/effect-Platform.md#worker-pools) |
| Scope for resource cleanup | [Scope for Resource Management](./context/effect-Platform.md#7-scope-for-resource-management) |
| .env / file tree config | [PlatformConfigProvider Layers](./context/effect-Platform.md#platformconfigprovider-layers) |

---

## Effect RPC

> Type-safe, transport-agnostic RPC framework built on Effect

**File:** [effect-Rpc.md](./context/effect-Rpc.md)

| Section | Description |
|---------|-------------|
| [Package Overview](./context/effect-Rpc.md#package-overview) | Dependencies, exports, module map |
| [Rpc (Procedure Definition)](./context/effect-Rpc.md#rpc-procedure-definition) | Rpc.make(), payload/success/error/stream, type extractors |
| [RpcGroup](./context/effect-Rpc.md#rpcgroup) | Grouping, .add/.merge/.middleware/.prefix, handler implementation |
| [RpcServer](./context/effect-Rpc.md#rpcserver) | Server engine, Protocol tag, 7 transport protocols |
| [RpcClient](./context/effect-Rpc.md#rpcclient) | Auto-generated typed stubs, Protocol tag, 3 transport protocols |
| [RpcMiddleware](./context/effect-Rpc.md#rpcmiddleware) | Tag factory, provides/wrap/optional/requiredForClient |
| [RpcMessage](./context/effect-Rpc.md#rpcmessage) | Wire protocol (FromClient/FromServer message types) |
| [RpcSerialization](./context/effect-Rpc.md#rpcserialization) | 5 formats: JSON, NDJSON, JSON-RPC, ND-JSON-RPC, MsgPack |
| [RpcSchema](./context/effect-Rpc.md#rpcschema) | Stream schema wrapper for streaming RPCs |
| [RpcTest](./context/effect-Rpc.md#rpctest) | In-memory test client (no serialization) |
| [Wrapper](./context/effect-Rpc.md#wrapper-fork--uninterruptible) | fork() and uninterruptible() for handler execution control |
| [End-to-End Example](./context/effect-Rpc.md#end-to-end-example) | Define → group → handlers → server → client → test |
| [Architecture Flow](./context/effect-Rpc.md#architecture-flow) | Full request lifecycle, stream backpressure, ping/pong |
| [Key Patterns](./context/effect-Rpc.md#key-patterns) | Protocol abstraction, Schema-driven types, prefix namespacing |

### RPC Subsections

| Topic | Section |
|-------|---------|
| Rpc.make() options table | [Constructor](./context/effect-Rpc.md#constructor) |
| Fluent combinators (setPayload, setSuccess) | [Fluent Combinators](./context/effect-Rpc.md#fluent-combinators) |
| 15+ type extractors | [Type Extractors](./context/effect-Rpc.md#type-extractors) |
| group.toLayer() handler impl | [Implementing Handlers](./context/effect-Rpc.md#implementing-handlers--tolayer) |
| Server Protocol implementations | [Protocol Implementations (Server)](./context/effect-Rpc.md#protocol-implementations-server) |
| layerHttpRouter convenience | [Convenience Layers](./context/effect-Rpc.md#convenience-layers) |
| toWebHandler (edge deploy) | [Convenience Layers](./context/effect-Rpc.md#convenience-layers) |
| Client prefix namespacing | [Client Type](./context/effect-Rpc.md#client-type) |
| Client Protocol implementations | [Protocol Implementations (Client)](./context/effect-Rpc.md#protocol-implementations-client) |
| withHeaders / currentHeaders | [Headers](./context/effect-Rpc.md#headers) |
| Middleware Tag options | [Tag Options](./context/effect-Rpc.md#tag-options) |
| Middleware application order | [Application Order](./context/effect-Rpc.md#application-order-server) |
| Client-side middleware | [Client Middleware](./context/effect-Rpc.md#client-middleware) |
| Serialization format guide | [Serialization Decision Guide](./context/effect-Rpc.md#serialization-decision-guide) |
| Protocol feature matrix | [Protocol Feature Matrix](./context/effect-Rpc.md#protocol-feature-matrix) |
| Backpressure (Ack protocol) | [Stream Backpressure](./context/effect-Rpc.md#stream-backpressure-ack-protocol) |
| Rpc.fork / Rpc.uninterruptible | [Wrapper](./context/effect-Rpc.md#wrapper-fork--uninterruptible) |

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
| Build a dependency graph | [effect-Layer](./context/effect-Layer.md#constructors) | [Composition](./context/effect-Layer.md#composition-the-four-key-operations) |
| provide vs provideMerge | [effect-Layer](./context/effect-Layer.md#composition-the-four-key-operations) | [Common Mistakes](./context/effect-Layer.md#common-mistakes--gotchas) |
| Layer memoization / sharing | [effect-Layer](./context/effect-Layer.md#memomap-automatic-sharing) | [fresh()](./context/effect-Layer.md#fresh--bypassing-memoization) |
| Validate API data | [effect-Schema](./context/effect-Schema.md#decoding--encoding) | [Common Patterns](./context/effect-Schema.md#common-patterns) |
| Fetch data in React | [effect-atom](./context/effect-atom.md#creating-service-backed-atoms) | [React Hooks](./context/effect-atom.md#react-hooks) |
| Handle loading states | [effect-atom](./context/effect-atom.md#common-patterns) | [Result type](./context/effect-atom.md#resulta-e--not-promises) |
| Query database with Drizzle | [sql-drizzle](./context/sql-drizzle.md#query-patterns) | [Service Pattern](./context/sql-drizzle.md#service-pattern-recommended) |
| Database transactions | [sql-drizzle](./context/sql-drizzle.md#transactions) | [Error Handling](./context/sql-drizzle.md#error-handling) |
| Inter-fiber communication | [effect-Queue](./context/effect-Queue.md#patterns) | [Backpressure](./context/effect-Queue.md#backpressure--suspension) |
| Rate limit / work queue | [effect-Queue](./context/effect-Queue.md#bounded-work-queue-rate-limiting) | [Queue Variants](./context/effect-Queue.md#queue-variants) |
| Fan-out work distribution | [effect-Queue](./context/effect-Queue.md#fan-out-multiple-consumers) | [Core Operations](./context/effect-Queue.md#core-operations) |
| Query Radix entity state | [radix-Gateway](./context/radix-Gateway.md#service-catalog) | [Usage Patterns](./context/radix-Gateway.md#usage-patterns) |
| Read Radix KV store | [radix-Gateway](./context/radix-Gateway.md#usage-patterns) | [Pagination](./context/radix-Gateway.md#pagination--batching) |
| Parse Radix component state | [radix-Gateway](./context/radix-Gateway.md#usage-patterns) | [SBOR Schema](./context/radix-Gateway.md#sbor-schema) |
| Handle Gateway rate limits | [radix-Gateway](./context/radix-Gateway.md#error-handling) | [Error Types](./context/radix-Gateway.md#error-types) |
| Verify ROLA proof | [radix-Gateway](./context/radix-Gateway.md#usage-patterns) | [Configuration](./context/radix-Gateway.md#configuration) |
| Compose Effect operations | [effect-Pipe](./context/effect-Pipe.md#standalone-vs-method-pipe) | [Patterns by Domain](./context/effect-Pipe.md#pipe-patterns-by-domain) |
| Choose pipe vs gen vs fn | [effect-Pipe](./context/effect-Pipe.md#pipe-vs-effectgen-vs-effectfn) | [Decision Table](./context/effect-Pipe.md#decision-table) |
| Transform plain values | [effect-Pipe](./context/effect-Pipe.md#pure-value-pipelines-either-chain) | [flow vs pipe](./context/effect-Pipe.md#flow-vs-pipe) |
| Make HTTP requests | [effect-Platform](./context/effect-Platform.md#http-client) | [Fetch Implementation](./context/effect-Platform.md#fetch-implementation) |
| Create HTTP server | [effect-Platform](./context/effect-Platform.md#http-server) | [Architecture Flows](./context/effect-Platform.md#architecture-flows) |
| Define HTTP API declaratively | [effect-Platform](./context/effect-Platform.md#declarative-http-api) | [HttpApiBuilder](./context/effect-Platform.md#httpapibuilder-implementation) |
| Route HTTP requests | [effect-Platform](./context/effect-Platform.md#http-router) | [Custom Router Tags](./context/effect-Platform.md#custom-router-tags) |
| Read/write files | [effect-Platform](./context/effect-Platform.md#filesystem) | [Stream-based I/O](./context/effect-Platform.md#stream-based-io) |
| Execute shell commands | [effect-Platform](./context/effect-Platform.md#command--commandexecutor) | [Process Interface](./context/effect-Platform.md#process-interface) |
| Use WebSockets | [effect-Platform](./context/effect-Platform.md#socket--socketserver) | [WebSocket Support](./context/effect-Platform.md#websocket-support) |
| Worker thread pool | [effect-Platform](./context/effect-Platform.md#worker--workerrunner) | [Worker Pools](./context/effect-Platform.md#worker-pools) |
| Define RPC procedures | [effect-Rpc](./context/effect-Rpc.md#rpc-procedure-definition) | [Rpc.make()](./context/effect-Rpc.md#constructor) |
| Group and implement RPC handlers | [effect-Rpc](./context/effect-Rpc.md#rpcgroup) | [Implementing Handlers](./context/effect-Rpc.md#implementing-handlers--tolayer) |
| Serve RPCs over WebSocket/HTTP | [effect-Rpc](./context/effect-Rpc.md#rpcserver) | [Protocol Implementations (Server)](./context/effect-Rpc.md#protocol-implementations-server) |
| Create typed RPC client | [effect-Rpc](./context/effect-Rpc.md#rpcclient) | [Protocol Implementations (Client)](./context/effect-Rpc.md#protocol-implementations-client) |
| Add RPC middleware | [effect-Rpc](./context/effect-Rpc.md#rpcmiddleware) | [Tag Options](./context/effect-Rpc.md#tag-options) |
| Stream data via RPC | [effect-Rpc](./context/effect-Rpc.md#rpcschema) | [Streaming as First-Class](./context/effect-Rpc.md#5-streaming-as-first-class) |
| Choose RPC serialization format | [effect-Rpc](./context/effect-Rpc.md#rpcserialization) | [Serialization Decision Guide](./context/effect-Rpc.md#serialization-decision-guide) |
| Test RPCs in-memory | [effect-Rpc](./context/effect-Rpc.md#rpctest) | [End-to-End Example](./context/effect-Rpc.md#end-to-end-example) |


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
