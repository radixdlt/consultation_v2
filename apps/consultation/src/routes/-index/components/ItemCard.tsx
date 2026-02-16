import { Link } from '@tanstack/react-router'
import { EntityId } from 'shared/governance/brandedTypes'
import type { EntityType } from 'shared/governance/brandedTypes'
import { AddressLink } from '@/components/AddressLink'
import { Card } from '@/components/ui/card'
import { formatDateRange } from '@/lib/utils'
import { EndingSoonBadge } from './EndingSoonBadge'
import { QuorumProgress } from './QuorumProgress'
import type { ItemStatus } from './StatusBadge'
import { getItemStatus, StatusBadge } from './StatusBadge'

type ItemCardProps = {
  id: number
  title: string
  shortDescription: string
  author: string
  start: Date
  deadline: Date
  quorum: number
  linkPrefix: '/tc' | '/proposal'
  hidden?: boolean
}

export function ItemCard({
  id,
  title,
  shortDescription,
  author,
  start,
  deadline,
  quorum,
  linkPrefix,
  hidden
}: ItemCardProps) {
  const status: ItemStatus = getItemStatus(deadline)
  const isActive = status === 'active'
  const typeLabel = linkPrefix === '/tc' ? 'TC' : 'GP'
  const entityType: EntityType = linkPrefix === '/tc' ? 'temperature_check' : 'proposal'
  const entityId = EntityId.make(id)

  return (
    <Link
      to={`${linkPrefix}/$id`}
      params={{ id: String(id) }}
      className="block group"
    >
      <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors p-6">
      <div className="flex flex-col sm:flex-row justify-between gap-6">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-xs text-neutral-500 font-mono">
              {typeLabel} #{id}
            </span>
            {isActive && <EndingSoonBadge deadline={deadline} />}
            {hidden && (
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                Hidden
              </span>
            )}
          </div>

          <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 group-hover:underline decoration-neutral-400 underline-offset-4">
            {title}
          </h3>

          <p className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-2">
            {shortDescription}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center text-xs text-neutral-500 gap-1 sm:gap-4">
            <span>
              By <AddressLink address={author} />
            </span>
            <span className="hidden sm:inline">&middot;</span>
            <span>{formatDateRange(start, deadline)}</span>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="sm:w-48 flex sm:flex-col justify-between sm:justify-center sm:items-center gap-4 border-t sm:border-t-0 sm:border-l border-neutral-100 dark:border-neutral-800 pt-4 sm:pt-0 sm:pl-6">
          <QuorumProgress
            entityType={entityType}
            entityId={entityId}
            quorum={quorum}
            isActive={isActive}
          />
        </div>
      </div>
      </Card>
    </Link>
  )
}
