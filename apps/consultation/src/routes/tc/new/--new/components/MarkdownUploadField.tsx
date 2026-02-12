import { FileTextIcon, UploadIcon, XIcon } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field'
import { withForm } from '../formHook'
import { temperatureCheckFormOpts } from '../formOptions'
import { DescriptionSchema, effectSchemaValidator } from '../schema'

export const MarkdownUploadField = withForm({
  ...temperatureCheckFormOpts,
  render: function Render({ form }) {
    const [uploadedFile, setUploadedFile] = useState<{
      name: string
      size: number
    } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const formId = useId()
    const descriptionId = `${formId}-description`
    const descriptionFileId = `${formId}-description-file`

    const [fileError, setFileError] = useState<string | null>(null)

    const handleFileUpload = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setFileError(null)
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result
          if (typeof content !== 'string') return
          form.setFieldValue('description', content)
          setUploadedFile({ name: file.name, size: file.size })
        }
        reader.onerror = () => {
          setFileError(`Failed to read file: ${file.name}`)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
        reader.readAsText(file)
      },
      [form]
    )

    const handleRemoveFile = useCallback(() => {
      form.setFieldValue('description', '')
      setUploadedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, [form])

    return (
      <form.Field
        name="description"
        validators={{
          onBlur: effectSchemaValidator(DescriptionSchema),
          onChange: effectSchemaValidator(DescriptionSchema)
        }}
      >
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={descriptionId}>
                Details (Markdown file)
              </FieldLabel>

              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.markdown"
                onChange={handleFileUpload}
                className="hidden"
                id={descriptionFileId}
              />

              {uploadedFile ? (
                <div className="flex items-center gap-3 p-4 bg-muted border border-border">
                  <FileTextIcon className="size-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border hover:border-muted-foreground cursor-pointer transition-colors w-full"
                >
                  <UploadIcon className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload a{' '}
                    <span className="font-medium">.md</span> file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Full proposal details in Markdown format
                  </p>
                </button>
              )}

              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}

              <FieldDescription>
                Upload a Markdown file with full proposal details.
              </FieldDescription>

              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>
    )
  }
})
