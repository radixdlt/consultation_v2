import { Result, useAtomMount, useAtomValue } from '@effect-atom/atom-react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import { voteResultsAtom, voteUpdatesAtom } from '@/atom/voteResultsAtom'
import type { VoteOption } from '../types'

type VoteResultsSectionProps = {
  id: ProposalId
  voteOptions: readonly VoteOption[]
}

export function VoteResultsSection({
  id,
  voteOptions
}: VoteResultsSectionProps) {
  useAtomMount(voteUpdatesAtom('proposal')(id))
  const voteResultsResult = useAtomValue(voteResultsAtom('proposal')(id))

  return Result.builder(voteResultsResult)
    .onInitial(() => null)
    .onFailure(() => (
      <div className="py-4 text-sm text-muted-foreground">
        Failed to load vote results.
      </div>
    ))
    .onSuccess((results) => {
      const resultMap = new Map(
        results.map((r) => [r.vote, Number(r.votePower)])
      )

      const totalVotePower = results.reduce(
        (sum, r) => sum + Number(r.votePower),
        0
      )

      // Build a row for every known option, filling in 0 for missing ones
      const allOptions = voteOptions.map((opt) => ({
        key: String(opt.id),
        label: opt.label,
        power: resultMap.get(String(opt.id)) ?? 0
      }))

      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vote Results
          </h3>
          <div className="space-y-3">
            {allOptions.map((option) => {
              const percentage =
                totalVotePower > 0
                  ? (option.power / totalVotePower) * 100
                  : 0

              return (
                <div key={option.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">
                      {option.label}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs tabular-nums">
                      {option.power.toLocaleString()} ({percentage.toFixed(1)}
                      %)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full bg-neutral-800 dark:bg-neutral-200 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    })
    .render()
}
