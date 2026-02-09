import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function CardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left side */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Header badges */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-16" />
          </div>

          {/* Title */}
          <Skeleton className="h-6 w-3/4" />

          {/* Description */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Right side - Quorum */}
        <div className="flex flex-col items-end gap-1.5 sm:ml-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-2 w-24 rounded-full" />
        </div>
      </div>
    </Card>
  )
}

export function CardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={`skeleton-${i}`} />
      ))}
    </div>
  )
}
