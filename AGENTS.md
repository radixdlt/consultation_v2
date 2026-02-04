# Agent Context Hub

Central index of context files for AI agents and coding assistants working with this codebase.

## Context Index

### [effect-Context](./context/effect-Context.md)
Effect dependency injection and service composition

| Section | Description |
|---------|-------------|
| [Core Concepts](./context/effect-Context.md#core-concepts) | Context.Tag, using services, providing services |
| [Context.Tag vs Effect.Service](./context/effect-Context.md#two-patterns-contexttag-vs-effectservice) | Pattern comparison with usage guidance |
| [Service Construction](./context/effect-Context.md#service-construction-options) | sync, effect, scoped constructors |
| [Layer Composition](./context/effect-Context.md#layer-composition) | Creating/composing layers, vertical/horizontal |
| [Type-Level Tracking](./context/effect-Context.md#type-level-dependency-tracking) | Compiler-enforced dependency safety |
| [Real-World Patterns](./context/effect-Context.md#real-world-patterns) | Ref state, factory services, scoped resources |
| [Common Mistakes](./context/effect-Context.md#common-mistakes) | Yield errors, layer order, async init |

### [effect-Schema](./context/effect-Schema.md)
Runtime validation and type transformation

| Section | Description |
|---------|-------------|
| [Core Concepts](./context/effect-Schema.md#core-concepts) | Schema<A, I, R> signature, encode/decode flow |
| [Built-in Schemas](./context/effect-Schema.md#built-in-schemas) | Primitives, strings, numbers, collections, structs |
| [Combinators](./context/effect-Schema.md#combinators-reference) | Union, optional, transforms, refinements, brands |
| [Decoding & Encoding](./context/effect-Schema.md#decoding--encoding) | API variants, validation, error formatting |
| [Common Patterns](./context/effect-Schema.md#common-patterns) | Class-based, tagged errors, discriminated unions |
| [Effect Integration](./context/effect-Schema.md#effect-integration) | Services in schema context, async validation |
| [Quick Reference](./context/effect-Schema.md#quick-reference) | Cheatsheet tables for common operations |

### [effect-atom](./context/effect-atom.md)
Reactive state management for Effect.js + React

| Section | Description |
|---------|-------------|
| [Core Mental Model](./context/effect-atom.md#core-mental-model) | Atom conceptual foundation — reactive Effect containers |
| [Key Concepts](./context/effect-atom.md#key-concepts) | Result type, Atom types, reference identity |
| [Project Patterns](./context/effect-atom.md#project-patterns) | Runtime setup, service atoms, families, derived atoms |
| [React Hooks](./context/effect-atom.md#react-hooks) | useAtomValue, useAtomSet, Suspense, refresh |
| [Toast Integration](./context/effect-atom.md#toast-integration-withtoast) | withToast wrapper for notifications |
| [Tagged Errors](./context/effect-atom.md#tagged-errors-pattern) | Data.TaggedError pattern for typed errors |
| [Memory Management](./context/effect-atom.md#memory-management) | keepAlive, TTL, finalizers |
| [Common Patterns](./context/effect-atom.md#common-patterns) | Loading states, conditional rendering, chaining |
| [API Quick Reference](./context/effect-atom.md#api-quick-reference) | Cheat sheet tables for creation, modifiers, hooks |

### [workflow](./context/workflow.md)
Upstash Workflow SDK deep analysis — durable serverless workflow engine

| Section | Description |
|---------|-------------|
| [Architecture](./context/workflow.md#architecture) | Request flow diagram, QStash as persistence layer |
| [Core Components](./context/workflow.md#core-components) | serveBase, WorkflowContext, AutoExecutor, BaseLazyStep |
| [Step Types](./context/workflow.md#step-types) | Run, Sleep, Call, Wait, Notify, Invoke, Webhook types |
| [Lazy Execution Pattern](./context/workflow.md#lazy-execution-pattern) | Plan steps vs result steps, deferred execution |
| [Execution Flow](./context/workflow.md#execution-flow-critical-path) | Request validation, step parsing, context creation |
| [Parallel Execution](./context/workflow.md#parallel-execution) | Promise.all detection, parallel call states, flow diagram |
| [State Management](./context/workflow.md#state-management) | No local state, step serialization, deduplication |
| [Middleware System](./context/workflow.md#middleware-system) | Lifecycle events, debug events, registration |
| [Error Handling](./context/workflow.md#error-handling) | Error hierarchy, WorkflowAbort as control flow |
| [Platform Adapters](./context/workflow.md#platform-adapters) | Next.js, Express, Hono, Cloudflare, TanStack adapters |
| [External Client API](./context/workflow.md#external-client-api) | Trigger, cancel, notify, getWaiters, logs |
| [Key Implementation Details](./context/workflow.md#key-implementation-details) | Step validation, nested prevention, Call step |
| [Best Practices](./context/workflow.md#best-practices) | Always await, don't catch WorkflowAbort, determinism |

### [workflow-TanstackStart](./context/workflow-TanstackStart.md)
Upstash Workflow integration for TanStack Start

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

## Adding Context

To add a new context file:

1. Create a markdown file in `./context/`
2. Add an entry to the table above with section-level links if applicable

## Project Notes

### apps/consultation
- **State Management**: Uses `@effect-atom/atom-react` (NOT Jotai)
