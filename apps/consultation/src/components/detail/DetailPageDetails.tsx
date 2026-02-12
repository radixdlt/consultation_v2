import { Download } from 'lucide-react'
import { useCallback } from 'react'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

type DetailPageDetailsProps = {
  shortDescription: string
  description?: string
  filename: string
}

export function DetailPageDetails({
  shortDescription,
  description,
  filename
}: DetailPageDetailsProps) {
  const handleDownload = useCallback(() => {
    if (!description) return
    const blob = new Blob([description], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [description, filename])

  return (
    <>
      {/* Short Description */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Description
        </h3>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {shortDescription}
        </p>
      </div>

      {/* Full Details (rendered markdown) */}
      {description && description !== shortDescription && (
        <div className="lg:border-t lg:border-border lg:pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Full Details
            </h3>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border hover:text-foreground hover:border-muted-foreground transition-colors cursor-pointer"
            >
              <Download className="size-3.5" />
              Download .md
            </button>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {description}
            </Markdown>
          </div>
        </div>
      )}
    </>
  )
}
