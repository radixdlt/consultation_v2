# Temperature Check Creation Form

## Overview

Form at `/tc/new` enabling users to create temperature checks with dynamic vote options and configurable selection settings.

## Fields

- **title** — text input, required, max 200 chars
- **description** — textarea, required, max 2000 chars
- **rfcUrl** — URL input, required, validated with `Schema.URL`
- **voteOptions** — dynamic list, min 2, max configurable (default 10)
  - Each option: auto-generated `id`, editable `label`
- **maxSelections** — radio (Single/Multiple choice) + conditional number input

## Component Structure

```
/tc/new/--new/
├── index.tsx                    # Page, renders form
├── components/
│   ├── TemperatureCheckForm.tsx # Main form with Tanstack Form
│   ├── VoteOptionsField.tsx     # Dynamic option list
│   └── MaxSelectionsField.tsx   # Radio + conditional number
└── schema.ts                    # Effect Schema validation
```

## Props

**TemperatureCheckForm:**
- `maxVoteOptions?: number` — default 10
- `onSuccess?: (result) => void` — callback after creation

## Validation Schema

```typescript
const VoteOptionSchema = Schema.Struct({
  id: Schema.Number,
  label: Schema.String.pipe(Schema.minLength(1))
})

const TemperatureCheckFormSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(2000)),
  rfcUrl: Schema.URL,
  voteOptions: Schema.Array(VoteOptionSchema).pipe(Schema.minItems(2)),
  maxSelections: Schema.Union(
    Schema.Literal(1),
    Schema.Number.pipe(Schema.greaterThan(1))
  )
})
```

**Cross-field:** `maxSelections` must be ≤ `voteOptions.length`

## UI Layout

```
┌─────────────────────────────────────────────┐
│ CardHeader: "Create Temperature Check"      │
├─────────────────────────────────────────────┤
│ [Title]           ________________________  │
│ [Description]     ________________________  │
│ [RFC URL]         ________________________  │
│ ─────────────────────────────────────────── │
│ [Vote Options]                              │
│   1. ______________________ [Remove]        │
│   2. ______________________ [Remove]        │
│   [+ Add Option]                            │
│ ─────────────────────────────────────────── │
│ [Selection Type]                            │
│   ○ Single choice                           │
│   ○ Multiple choice → [Max: ___]            │
├─────────────────────────────────────────────┤
│ CardFooter: [Create Temperature Check]      │
└─────────────────────────────────────────────┘
```

## Interactions

- **Add Option:** append with auto-id, focus new input
- **Remove Option:** remove, renumber ids, disabled at 2 options
- **Multiple choice:** show number input, default 2, max = option count
- **Edge case:** removing option when maxSelections > new count → auto-adjust

## Files to Modify

| File | Action |
|------|--------|
| `src/routes/tc/new/--new/index.tsx` | Replace with form |
| `src/routes/tc/new/--new/components/TemperatureCheckForm.tsx` | Create |
| `src/routes/tc/new/--new/components/VoteOptionsField.tsx` | Create |
| `src/routes/tc/new/--new/components/MaxSelectionsField.tsx` | Create |
| `src/routes/tc/new/--new/schema.ts` | Create |
| `packages/shared/src/governance/schemas.ts` | Add max_selections |

## Dependencies

- Add `@tanstack/react-form`

## Out of Scope

- Draft saving
- Option reordering
- Character counters
