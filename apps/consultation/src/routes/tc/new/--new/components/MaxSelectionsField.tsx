import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
          const isMultiple = field.state.value > 1
          const maxAllowed = Math.min(optionCount, 5)
          const isInvalid =
            isMultiple &&
            (field.state.value < 2 || field.state.value > maxAllowed)

          return (
            <div>
              {/* Toggle Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isMultiple ? 'default' : 'secondary'}
                  onClick={() => field.handleChange(1)}
                  className="flex-1"
                >
                  Single Choice
                </Button>
                <Button
                  type="button"
                  variant={isMultiple ? 'default' : 'secondary'}
                  onClick={() => field.handleChange(2)}
                  className="flex-1"
                >
                  Multiple Choice
                </Button>
              </div>

              {/* Max Selections Input - shown when multiple choice */}
              {isMultiple && (
                <div className="mt-4 p-4 bg-muted/50 border border-border">
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="max-selections">
                      How many options can voters select?
                    </FieldLabel>
                    <Input
                      id="max-selections"
                      type="number"
                      min={2}
                      max={maxAllowed}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number.parseInt(e.target.value) || 2)
                      }
                      className="max-w-[120px]"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError>
                        Must be between 2 and {maxAllowed}
                      </FieldError>
                    )}
                  </Field>
                </div>
              )}
            </div>
          )
        }}
      </form.Field>
    )
  }
})
