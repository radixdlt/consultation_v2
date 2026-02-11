import { Link } from '@tanstack/react-router'
import { EntityId, type EntityType } from 'shared/governance/brandedTypes'
import { AddressLink } from '@/components/AddressLink'
import { Card } from '@/components/ui/card'
import { formatDateRange } from '@/lib/utils'
import { EndingSoonBadge } from './EndingSoonBadge'
import { QuorumProgress } from './QuorumProgress'
import { getItemStatus, type ItemStatus, StatusBadge } from './StatusBadge'

type ItemCardProps = {
  id: number
  title: string
  shortDescription: string
  author: string
  start: Date
  deadline: Date
  quorum: string
  linkPrefix: '/tc' | '/proposal'
}

export function ItemCard({
  id,
  title,
  shortDescription,
  author,
  start,
  deadline,
  quorum,
  linkPrefix
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
          </div>

          <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 group-hover:underline decoration-neutral-400 underline-offset-4">
            {title}
          </h3>

          <p className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-2">
            {shortDescription}
          </p>

          <div className="pt-2 flex items-center text-xs text-neutral-500 gap-4">
            <span>
              By <AddressLink address={author} />
            </span>
            <span>&middot;</span>
            <span>{formatDateRange(start, deadline)}</span>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="sm:w-48 flex sm:flex-col justify-between sm:justify-center sm:items-center gap-4 sm:border-l border-neutral-100 dark:border-neutral-800 sm:pl-6">
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
