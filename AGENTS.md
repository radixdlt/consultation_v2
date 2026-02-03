# Agent Context Hub

Central index of context files for AI agents and coding assistants working with this codebase.

## Context Index

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

## Adding Context

To add a new context file:

1. Create a markdown file in `./context/`
2. Add an entry to the table above with section-level links if applicable

