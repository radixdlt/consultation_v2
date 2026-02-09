import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { withForm } from '../formHook'
import { temperatureCheckFormOpts } from '../formOptions'

export const MaxSelectionsField = withForm({
  ...temperatureCheckFormOpts,
  props: {
    optionCount: 2
  },
  render: function Render({ form, optionCount }) {
    return (
      <form.Field name="maxSelections">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor="max-selections">
                Maximum Selections
              </FieldLabel>
              <Select
                value={String(field.state.value)}
                onValueChange={(value) => field.handleChange(Number(value))}
              >
                <SelectTrigger id="max-selections" aria-invalid={isInvalid}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: optionCount }, (_, i) => i + 1).map(
                    (n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 1 ? '1 (Single choice)' : n}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <FieldDescription>
                {field.state.value === 1
                  ? 'Voters can select exactly one option.'
                  : `Voters can select up to ${field.state.value} of ${optionCount} options.`}
              </FieldDescription>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>
    )
  }
})
