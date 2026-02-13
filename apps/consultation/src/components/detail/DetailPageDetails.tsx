import { Download } from 'lucide-react'
import { useCallback } from 'react'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

type ProposalVoteOption = { readonly id: number; readonly label: string }

type DetailPageDetailsProps = {
  shortDescription: string
  description?: string
  filename: string
  proposalVoteOptions?: readonly ProposalVoteOption[]
}

export function DetailPageDetails({
  shortDescription,
  description,
  filename,
  proposalVoteOptions
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

      {/* GP Vote Options (shown on TCs) */}
      {proposalVoteOptions && proposalVoteOptions.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-4">
            These options will be available for voting if this TC is promoted to a Governance Proposal.
          </p>
          <div className="space-y-2">
            {proposalVoteOptions.map((option, index) => (
              <div
                key={option.id}
                className="flex items-center gap-3 p-3 border border-border bg-secondary/50 text-sm"
              >
                <span className="size-6 flex items-center justify-center text-xs font-bold text-muted-foreground bg-background border border-border">
                  {index + 1}
                </span>
                <span className="font-medium text-foreground">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
