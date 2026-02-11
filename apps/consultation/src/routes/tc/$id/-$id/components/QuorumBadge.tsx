import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { voteResultsAtom } from '@/atom/voteResultsAtom'

type QuorumBadgeProps = {
  id: TemperatureCheckId
  quorum: string
}

export function QuorumBadge({ id, quorum }: QuorumBadgeProps) {
  const voteResultsResult = useAtomValue(
    voteResultsAtom('temperature_check')(id)
  )

  return Result.builder(voteResultsResult)
    .onInitial(() => null)
    .onFailure(() => null)
    .onSuccess((results) => {
      const totalVotePower = results.reduce(
        (sum, r) => sum + Number(r.votePower),
        0
      )
      const quorumTarget = Number(quorum)
      const rawPercentage = quorumTarget === 0 ? 100 : (totalVotePower / quorumTarget) * 100
      const quorumMet = totalVotePower >= quorumTarget

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
            quorumMet
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
        >
          Quorum {Math.round(rawPercentage)}%
        </span>
      )
    })
    .render()
}
