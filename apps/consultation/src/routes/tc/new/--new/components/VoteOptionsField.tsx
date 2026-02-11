import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withForm } from '../formHook'
import {
  createVoteOption,
  temperatureCheckFormOpts,
  type VoteOption
} from '../formOptions'

export const VoteOptionsField = withForm({
  ...temperatureCheckFormOpts,
  props: {
    maxOptions: 10
  },
  render: function Render({ form, maxOptions }) {
    return (
      <form.Field
        name="voteOptions"
        mode="array"
        validators={{
          onBlur: ({ value }) =>
            value.length < 2
              ? { message: 'At least 2 options required' }
              : undefined
        }}
      >
        {(field) => {
          const voteOptions: VoteOption[] = field.state.value
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid

          const handleRemove = (index: number) => {
            field.removeValue(index)
          }

          const handleAdd = () => {
            field.pushValue(createVoteOption())
          }

          return (
            <FieldGroup>
              <div className="flex flex-col gap-4">
                {voteOptions.map((option, index) => (
                  <div key={option.id} className="flex gap-3 items-start">
                    <form.Field
                      name={`voteOptions[${index}].label`}
                      validators={{
                        onBlur: ({ value }) =>
                          !value
                            ? { message: 'Label is required' }
                            : undefined,
                        onChange: () => undefined
                      }}
                    >
                      {(subField) => {
                        const isSubFieldInvalid =
                          subField.state.meta.isTouched &&
                          !subField.state.meta.isValid

                        return (
                          <Field
                            data-invalid={isSubFieldInvalid}
                            className="flex-1"
                          >
                            <Input
                              id={`vote-option-${option.id}`}
                              name={subField.name}
                              value={subField.state.value}
                              onBlur={subField.handleBlur}
                              onChange={(e) =>
                                subField.handleChange(e.target.value)
                              }
                              aria-invalid={isSubFieldInvalid}
                              placeholder={`Option ${index + 1} label`}
                            />
                            {isSubFieldInvalid && (
                              <FieldError errors={subField.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>

                    {voteOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(index)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {voteOptions.length < maxOptions && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAdd}
                  className="w-full mt-2 py-3 border-dashed"
                >
                  <PlusIcon className="size-4" />
                  Add Option
                </Button>
              )}

              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </FieldGroup>
          )
        }}
      </form.Field>
    )
  }
})
