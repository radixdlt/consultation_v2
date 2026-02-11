import { useNavigate } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useCallback } from 'react'

type OriginBadgeProps = {
  type: 'tc' | 'proposal'
  id: number
}

export function OriginBadge({ type, id }: OriginBadgeProps) {
  const navigate = useNavigate()

  const label = type === 'tc' ? `TC #${id}` : `GP #${id}`
  const route = type === 'tc' ? '/tc/$id' : '/proposal/$id'

  const handleNavigate = useCallback(() => {
    navigate({ to: route, params: { id: String(id) } })
  }, [navigate, route, id])

  return (
    <button
      type="button"
      onClick={handleNavigate}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:text-foreground transition-colors"
    >
      Originated from {label}
      <ArrowUpRight className="size-3" />
    </button>
  )
}
