import { cn } from '@/lib/utils'

export type ItemStatus = 'active' | 'closed' | 'passed'

type StatusBadgeProps = {
  status: ItemStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm',
        status === 'active' &&
          'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black',
        status === 'closed' &&
          'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
        status === 'passed' &&
          'bg-blue-600 text-white dark:bg-blue-500'
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function getItemStatus(deadline: Date): ItemStatus {
  const now = new Date()
  if (deadline > now) {
    return 'active'
  }
  return 'closed'
}
