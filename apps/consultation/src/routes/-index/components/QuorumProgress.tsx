import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { voteResultsAtom } from '@/atom/voteResultsAtom'
import { formatXrd } from '@/lib/utils'

type QuorumProgressProps = {
  entityType: EntityType
  entityId: EntityId
  quorum: string
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

  return Result.builder(voteResultsResult)
    .onInitial(() => (
      <QuorumProgressDisplay quorumProgress={0} totalPower={0} isActive={isActive} />
    ))
    .onFailure(() => (
      <QuorumProgressDisplay quorumProgress={0} totalPower={0} isActive={isActive} />
    ))
    .onSuccess((results) => {
      const totalPower = results.reduce(
        (sum, r) => sum + Number(r.votePower),
        0
      )
      const quorumTarget = Number(quorum)
      const quorumProgress = quorumTarget === 0 ? 100 : (totalPower / quorumTarget) * 100

      return (
        <QuorumProgressDisplay
          quorumProgress={quorumProgress}
          totalPower={totalPower}
          isActive={isActive}
        />
      )
    })
    .render()
}

type QuorumProgressDisplayProps = {
  quorumProgress: number
  totalPower: number
  isActive?: boolean
}

function QuorumProgressDisplay({
  quorumProgress,
  totalPower,
  isActive
}: QuorumProgressDisplayProps) {
  const quorumProgressCapped = Math.min(quorumProgress, 100)
  const isHighProgress = quorumProgress >= 100

  return (
    <div className="flex flex-col justify-center gap-4">
      {/* Quorum Progress */}
      <div>
        <div className="text-xs text-neutral-500 uppercase mb-1">
          Quorum Progress
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

      {/* Votes */}
      <div>
        <div className="text-xs text-neutral-500 uppercase mb-1">Votes</div>
        <div className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
          {formatXrd(totalPower)} XRD
        </div>
      </div>
    </div>
  )
}
