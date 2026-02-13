import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { isCalculatingAtom, voteResultsAtom } from '@/atom/voteResultsAtom'
import { Skeleton } from '@/components/ui/skeleton'
import { formatXrd } from '@/lib/utils'

type QuorumProgressProps = {
  entityType: EntityType
  entityId: EntityId
  quorum: number
  isActive?: boolean
}

export function QuorumProgress({
  entityType,
  entityId,
  quorum,
  isActive
}: QuorumProgressProps) {
  const voteResultsResult = useAtomValue(
    voteResultsAtom(entityType)(entityId)
  )
  const isCalculating = useAtomValue(isCalculatingAtom(entityType)(entityId))

  return Result.builder(voteResultsResult)
    .onInitial(() => <QuorumProgressSkeleton />)
    .onFailure(() => (
      <div className="flex flex-row sm:flex-col gap-8 sm:gap-4">
        <div className="flex-1 sm:flex-none">
          <div className="text-xs text-neutral-500 uppercase mb-1">Quorum Progress</div>
          <div className="text-sm text-muted-foreground">--</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 uppercase mb-1">Votes</div>
          <div className="text-sm text-muted-foreground">--</div>
        </div>
      </div>
    ))
    .onSuccess((results) => {
      const totalPower = results.reduce(
        (sum, r) => sum + Number(r.votePower),
        0
      )
      const quorumProgress = !Number.isFinite(quorum) || quorum <= 0
        ? 0
        : (totalPower / quorum) * 100

      return (
        <QuorumProgressDisplay
          quorumProgress={quorumProgress}
          totalPower={totalPower}
          isActive={isActive}
          isCalculating={isCalculating}
        />
      )
    })
    .render()
}

type QuorumProgressDisplayProps = {
  quorumProgress: number
  totalPower: number
  isActive?: boolean
  isCalculating?: boolean
}

function QuorumProgressSkeleton() {
  return (
    <div className="flex flex-row sm:flex-col gap-8 sm:gap-4">
      <div className="flex-1 sm:flex-none">
        <div className="text-xs text-neutral-500 uppercase mb-1">
          Quorum Progress
        </div>
        <Skeleton className="h-7 w-12 mt-0.5" />
        <Skeleton className="w-full h-1.5 mt-2" />
      </div>
      <div>
        <div className="text-xs text-neutral-500 uppercase mb-1">Votes</div>
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}

function QuorumProgressDisplay({
  quorumProgress,
  totalPower,
  isActive,
  isCalculating
}: QuorumProgressDisplayProps) {
  const quorumProgressCapped = Math.min(quorumProgress, 100)
  const isHighProgress = quorumProgress >= 100

  return (
    <div className={`flex flex-row sm:flex-col gap-8 sm:gap-4${isCalculating ? ' animate-pulse' : ''}`}>
      {/* Quorum Progress */}
      <div className="flex-1 sm:flex-none">
        <div className="text-xs text-neutral-500 uppercase mb-1">
          Quorum Progress
          {isCalculating && (
            <span className="ml-2 normal-case text-muted-foreground">
              Recalculating…
            </span>
          )}
        </div>
        <div
          className={`text-lg font-semibold ${isHighProgress ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
        >
          {Math.round(quorumProgress)}%
        </div>
        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 mt-2 overflow-hidden">
          <div
            className={`h-full ${isActive ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-600'}`}
            style={{ width: `${quorumProgressCapped}%` }}
          />
        </div>
      </div>

      {/* Votes - beside quorum on mobile, below on desktop */}
      <div>
        <div className="text-xs text-neutral-500 uppercase mb-1">Votes</div>
        <div className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
          {formatXrd(totalPower)} XRD
        </div>
      </div>
    </div>
  )
}
