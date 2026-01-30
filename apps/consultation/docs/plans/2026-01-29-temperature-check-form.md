# Temperature Check Form Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build form at `/tc/new` for creating temperature checks with dynamic vote options and max selections.

**Architecture:** Tanstack Form for state, Effect Schema for validation, existing UI components (Card, Field, Button) + new shadcn components (Input, Textarea, RadioGroup).

**Tech Stack:** React, Tanstack Form, Effect Schema, shadcn/ui, Tailwind

---

## Task 1: Add Missing UI Components

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/radio-group.tsx`

**Step 1: Install shadcn components**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm dlx shadcn@latest add input textarea radio-group
```

Expected: Components added to `src/components/ui/`

**Step 2: Verify components exist**

Run:
```bash
ls src/components/ui/ | grep -E "input|textarea|radio"
```

Expected: `input.tsx`, `textarea.tsx`, `radio-group.tsx`

**Step 3: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/radio-group.tsx
git commit -m "feat: add input, textarea, radio-group UI components"
```

---

## Task 2: Update Shared Schema

**Files:**
- Modify: `packages/shared/src/governance/schemas.ts`

**Step 1: Add maxSelections to MakeTemperatureCheckInputSchema**

In `packages/shared/src/governance/schemas.ts`, update `MakeTemperatureCheckInputSchema`:

```typescript
export const MakeTemperatureCheckInputSchema = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  voteOptions: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      label: Schema.String
    })
  ),
  rfcUrl: Schema.URL,
  maxSelections: Schema.Union(
    Schema.Literal(1),
    Schema.Number.pipe(Schema.greaterThan(1))
  )
})
```

**Step 2: Verify types compile**

Run:
```bash
cd /Users/alex/Projects/vote-collector && pnpm tsc --noEmit -p packages/shared
```

Expected: No errors

**Step 3: Commit**

```bash
git add packages/shared/src/governance/schemas.ts
git commit -m "feat: add maxSelections to MakeTemperatureCheckInput schema"
```

---

## Task 3: Create Form Validation Schema

**Files:**
- Create: `src/routes/tc/new/--new/schema.ts`

**Step 1: Create the schema file**

```typescript
import { Schema } from 'effect'

const VoteOptionSchema = Schema.Struct({
  id: Schema.Number,
  label: Schema.String.pipe(
    Schema.minLength(1, { message: () => 'Label is required' })
  )
})

export const TemperatureCheckFormSchema = Schema.Struct({
  title: Schema.String.pipe(
    Schema.minLength(1, { message: () => 'Title is required' }),
    Schema.maxLength(200, { message: () => 'Title must be 200 characters or less' })
  ),
  description: Schema.String.pipe(
    Schema.minLength(1, { message: () => 'Description is required' }),
    Schema.maxLength(2000, { message: () => 'Description must be 2000 characters or less' })
  ),
  rfcUrl: Schema.URL,
  voteOptions: Schema.Array(VoteOptionSchema).pipe(
    Schema.minItems(2, { message: () => 'At least 2 options required' })
  ),
  maxSelections: Schema.Union(
    Schema.Literal(1),
    Schema.Number.pipe(Schema.greaterThan(1))
  )
})

export type TemperatureCheckFormData = typeof TemperatureCheckFormSchema.Type
```

**Step 2: Verify file exists and compiles**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/tc/new/--new/schema.ts
git commit -m "feat: add TemperatureCheckFormSchema with Effect Schema validation"
```

---

## Task 4: Create VoteOptionsField Component

**Files:**
- Create: `src/routes/tc/new/--new/components/VoteOptionsField.tsx`

**Step 1: Create the component**

```tsx
import { useForm } from '@tanstack/react-form'
import { Trash2Icon, PlusIcon } from 'lucide-react'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type VoteOptionsFieldProps = {
  form: ReturnType<typeof useForm<any>>
  maxOptions: number
}

export function VoteOptionsField({ form, maxOptions }: VoteOptionsFieldProps) {
  return (
    <form.Field
      name="voteOptions"
      mode="array"
      children={(field) => {
        const isInvalid =
          field.state.meta.isTouched && !field.state.meta.isValid

        return (
          <FieldGroup>
            <FieldLabel>Vote Options</FieldLabel>
            <FieldDescription>
              Add between 2 and {maxOptions} options for voters to choose from.
            </FieldDescription>

            <div className="flex flex-col gap-2">
              {field.state.value.map((_, index) => (
                <form.Field
                  key={index}
                  name={`voteOptions[${index}].label`}
                  children={(subField) => {
                    const isSubFieldInvalid =
                      subField.state.meta.isTouched &&
                      !subField.state.meta.isValid

                    return (
                      <Field data-invalid={isSubFieldInvalid}>
                        <div className="flex gap-2">
                          <Input
                            id={`vote-option-${index}`}
                            name={subField.name}
                            value={subField.state.value}
                            onBlur={subField.handleBlur}
                            onChange={(e) =>
                              subField.handleChange(e.target.value)
                            }
                            aria-invalid={isSubFieldInvalid}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => field.removeValue(index)}
                            disabled={field.state.value.length <= 2}
                            aria-label={`Remove option ${index + 1}`}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                        {isSubFieldInvalid && (
                          <FieldError errors={subField.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                field.pushValue({ id: field.state.value.length, label: '' })
              }
              disabled={field.state.value.length >= maxOptions}
            >
              <PlusIcon className="size-4" />
              Add Option
            </Button>

            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </FieldGroup>
        )
      }}
    />
  )
}
```

**Step 2: Create components directory if needed**

Run:
```bash
mkdir -p /Users/alex/Projects/vote-collector/apps/client/src/routes/tc/new/--new/components
```

**Step 3: Verify file compiles**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/tc/new/--new/components/VoteOptionsField.tsx
git commit -m "feat: add VoteOptionsField component with dynamic add/remove"
```

---

## Task 5: Create MaxSelectionsField Component

**Files:**
- Create: `src/routes/tc/new/--new/components/MaxSelectionsField.tsx`

**Step 1: Create the component**

```tsx
import { useForm } from '@tanstack/react-form'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

type MaxSelectionsFieldProps = {
  form: ReturnType<typeof useForm<any>>
  optionCount: number
}

export function MaxSelectionsField({
  form,
  optionCount
}: MaxSelectionsFieldProps) {
  return (
    <form.Field
      name="maxSelections"
      children={(field) => {
        const isInvalid =
          field.state.meta.isTouched && !field.state.meta.isValid
        const isMultiple = field.state.value > 1

        return (
          <FieldSet>
            <FieldLegend>Selection Type</FieldLegend>
            <FieldDescription>
              Choose whether voters can select one or multiple options.
            </FieldDescription>

            <RadioGroup
              value={isMultiple ? 'multiple' : 'single'}
              onValueChange={(value) => {
                if (value === 'single') {
                  field.handleChange(1)
                } else {
                  field.handleChange(2)
                }
              }}
            >
              <FieldGroup data-slot="radio-group">
                <Field orientation="horizontal" data-invalid={isInvalid}>
                  <RadioGroupItem value="single" id="selection-single" />
                  <Label htmlFor="selection-single" className="font-normal">
                    Single choice
                  </Label>
                </Field>

                <Field orientation="horizontal" data-invalid={isInvalid}>
                  <RadioGroupItem value="multiple" id="selection-multiple" />
                  <Label htmlFor="selection-multiple" className="font-normal">
                    Multiple choice
                  </Label>
                </Field>
              </FieldGroup>
            </RadioGroup>

            {isMultiple && (
              <Field>
                <FieldLabel htmlFor="max-selections-input">
                  Maximum selections
                </FieldLabel>
                <Input
                  id="max-selections-input"
                  type="number"
                  min={2}
                  max={optionCount}
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(Number(e.target.value) || 2)
                  }
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                  className="w-24"
                />
                <FieldDescription>
                  Voters can select up to {field.state.value} of {optionCount}{' '}
                  options.
                </FieldDescription>
              </Field>
            )}

            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </FieldSet>
        )
      }}
    />
  )
}
```

**Step 2: Verify file compiles**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/tc/new/--new/components/MaxSelectionsField.tsx
git commit -m "feat: add MaxSelectionsField with radio toggle and conditional input"
```

---

## Task 6: Create TemperatureCheckForm Component

**Files:**
- Create: `src/routes/tc/new/--new/components/TemperatureCheckForm.tsx`

**Step 1: Create the component**

> **Note:** This component follows Vercel React best practices:
> - Default values hoisted to module scope (`rerender-memo-with-default-value`)
> - useEffect for derived state updates (`rerender-derived-state-no-effect`)

```tsx
import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { Schema } from 'effect'
import { LoaderIcon } from 'lucide-react'
import { useAtom } from '@effect-atom/atom-react'
import { makeTemperatureCheckAtom } from '@/atom/temperatureChecksAtom'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { TemperatureCheckFormSchema } from '../schema'
import { VoteOptionsField } from './VoteOptionsField'
import { MaxSelectionsField } from './MaxSelectionsField'

// Hoisted to module scope to prevent recreation on each render
const DEFAULT_VOTE_OPTIONS = [
  { id: 0, label: '' },
  { id: 1, label: '' }
]

type TemperatureCheckFormProps = {
  maxVoteOptions?: number
  onSuccess?: (result: unknown) => void
}

function effectSchemaValidator<T>(schema: Schema.Schema<T, any>) {
  return {
    validate: ({ value }: { value: unknown }) => {
      const result = Schema.decodeUnknownEither(schema)(value)
      if (result._tag === 'Left') {
        const errors = result.left.message
        return errors
      }
      return undefined
    }
  }
}

export function TemperatureCheckForm({
  maxVoteOptions = 10,
  onSuccess
}: TemperatureCheckFormProps) {
  const [makeResult, makeTemperatureCheck] = useAtom(makeTemperatureCheckAtom)

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      rfcUrl: '',
      voteOptions: DEFAULT_VOTE_OPTIONS,
      maxSelections: 1
    },
    validators: {
      onSubmit: effectSchemaValidator(TemperatureCheckFormSchema)
    },
    onSubmit: async ({ value }) => {
      const result = await makeTemperatureCheck({
        title: value.title,
        description: value.description,
        rfcUrl: value.rfcUrl,
        voteOptions: value.voteOptions,
        maxSelections: value.maxSelections
      })
      if (result && onSuccess) {
        onSuccess(result)
      }
    }
  })

  const optionCount = form.useStore((state) => state.values.voteOptions.length)
  const maxSelections = form.useStore((state) => state.values.maxSelections)

  // Auto-adjust maxSelections if it exceeds option count (useEffect prevents render-during-render)
  useEffect(() => {
    if (maxSelections > optionCount) {
      form.setFieldValue('maxSelections', optionCount)
    }
  }, [maxSelections, optionCount, form])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Temperature Check</CardTitle>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <CardContent>
          <FieldGroup>
            {/* Title */}
            <form.Field
              name="title"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="title">Title</FieldLabel>
                    <Input
                      id="title"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Enter a clear, descriptive title"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />

            {/* Description */}
            <form.Field
              name="description"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Describe what this temperature check is about"
                      className="min-h-[120px]"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />

            {/* RFC URL */}
            <form.Field
              name="rfcUrl"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="rfcUrl">RFC URL</FieldLabel>
                    <Input
                      id="rfcUrl"
                      name={field.name}
                      type="url"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="https://..."
                    />
                    <FieldDescription>
                      Link to the RFC or proposal document.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />

            <Separator />

            {/* Vote Options */}
            <VoteOptionsField form={form} maxOptions={maxVoteOptions} />

            <Separator />

            {/* Max Selections */}
            <MaxSelectionsField form={form} optionCount={optionCount} />
          </FieldGroup>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={makeResult.waiting} className="w-full">
            {makeResult.waiting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Temperature Check'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Step 2: Verify file compiles**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/tc/new/--new/components/TemperatureCheckForm.tsx
git commit -m "feat: add TemperatureCheckForm with all fields and validation"
```

---

## Task 7: Update Page Component

**Files:**
- Modify: `src/routes/tc/new/--new/index.tsx`

**Step 1: Replace page with form**

```tsx
import { TemperatureCheckForm } from './components/TemperatureCheckForm'

export const Page: React.FC = () => {
  return (
    <div className="container mx-auto py-8 flex justify-center">
      <TemperatureCheckForm />
    </div>
  )
}
```

**Step 2: Verify the app builds**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/routes/tc/new/--new/index.tsx
git commit -m "feat: integrate TemperatureCheckForm into page"
```

---

## Task 8: Manual Testing

**Step 1: Start dev server**

Run:
```bash
cd /Users/alex/Projects/vote-collector/apps/client && pnpm dev
```

**Step 2: Test the form**

Navigate to: `http://localhost:3000/tc/new`

Verify:
- [ ] Form renders with all fields
- [ ] Can add vote options up to max (10)
- [ ] Can remove vote options down to min (2)
- [ ] Radio buttons toggle single/multiple choice
- [ ] Number input shows when "Multiple choice" selected
- [ ] maxSelections auto-adjusts when removing options
- [ ] Validation errors show on blur for empty required fields
- [ ] Submit button shows loading state
- [ ] Toast appears on success/failure

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add Input, Textarea, RadioGroup via shadcn |
| 2 | Add maxSelections to shared schema |
| 3 | Create form validation schema |
| 4 | Create VoteOptionsField component |
| 5 | Create MaxSelectionsField component |
| 6 | Create TemperatureCheckForm component |
| 7 | Update page to render form |
| 8 | Manual testing |
