import { Link } from '@tanstack/react-router'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type EmptyStateProps = {
  type: 'proposal' | 'temperature-check'
}

export function EmptyState({ type }: EmptyStateProps) {
  const isProposal = type === 'proposal'
  const title = isProposal ? 'No proposals yet' : 'No temperature checks yet'
  const description = isProposal
    ? 'Governance proposals will appear here once created.'
    : 'Temperature checks are used to gauge community interest before creating a formal proposal.'

  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 py-12">
      <div className="mb-4 bg-muted p-3">
        <FileText className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
        {description}
      </p>
      {!isProposal && (
        <Button type="button" asChild>
          <Link to="/tc/new">
            <Plus className="mr-2 size-4" />
            Create Temperature Check
          </Link>
        </Button>
      )}
    </div>
  )
}
