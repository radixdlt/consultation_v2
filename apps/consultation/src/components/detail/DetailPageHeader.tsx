import { Calendar, ExternalLink, LinkIcon, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { AddressLink } from '@/components/AddressLink'
import { formatDateTime } from '@/lib/utils'
import type { ItemStatus } from '@/routes/-index/components/StatusBadge'
import { StatusBadge } from '@/routes/-index/components/StatusBadge'

type DetailPageHeaderProps = {
  status: ItemStatus
  typeBadge: string
  id: number
  title: string
  start: Date
  deadline: Date
  author: string
  links: readonly string[]
  quorumBadge?: ReactNode
  originBadge?: ReactNode
}

export function DetailPageHeader({
  status,
  typeBadge,
  id,
  title,
  start,
  deadline,
  author,
  links,
  quorumBadge,
  originBadge
}: DetailPageHeaderProps) {
  return (
    <div className="lg:border-b lg:border-border lg:pb-6 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={status} />
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {typeBadge}
        </span>
        {quorumBadge && <div className="ml-auto">{quorumBadge}</div>}
      </div>
      <h1 className="text-3xl md:text-4xl font-light text-foreground leading-tight">
        {title}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground font-mono">
        <span>
          {typeBadge} #{id}
        </span>
        {originBadge}
      </div>
      <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
        <Calendar className="size-4 mt-0.5" />
        <span className="font-mono">
          <span>{formatDateTime(start)}</span>
          <span className="mx-1">–</span>
          <br className="sm:hidden" />
          <span>{formatDateTime(deadline)}</span>
        </span>
      </div>
      {author && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <User className="size-4" />
          <AddressLink
            address={author}
            className="font-mono text-xs text-muted-foreground"
          />
        </div>
      )}
      {links.length > 0 && (
        <div className="mt-4 flex items-center gap-4">
          {links.filter((link) => /^https?:\/\//i.test(link)).map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hover:underline text-sm flex items-center gap-1 min-w-0"
            >
              <LinkIcon className="size-3 shrink-0" />
              <span className="truncate">{link}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
