import { Result, useAtomMount, useAtomValue } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { voteResultsAtom, voteUpdatesAtom } from '@/atom/voteResultsAtom'

function formatXrd(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toFixed(2)
}

type VoteResultsSectionProps = {
  id: TemperatureCheckId
}

export function VoteResultsSection({ id }: VoteResultsSectionProps) {
  useAtomMount(voteUpdatesAtom('temperature_check')(id))
  const voteResultsResult = useAtomValue(
    voteResultsAtom('temperature_check')(id)
  )

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

      const forPower = resultMap.get('For') ?? 0
      const againstPower = resultMap.get('Against') ?? 0
      const forPercentage =
        totalVotePower > 0 ? (forPower / totalVotePower) * 100 : 0
      const againstPercentage =
        totalVotePower > 0 ? (againstPower / totalVotePower) * 100 : 0

      return (
        <div className="bg-card border border-border p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Current Results
            </h3>
          </div>

          {/* Vote Tallies */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">For</span>
                <span className="text-muted-foreground">
                  {formatXrd(forPower)} XRD ({forPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2">
                <div
                  className="bg-green-600 dark:bg-green-500 h-full transition-all"
                  style={{ width: `${forPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">Against</span>
                <span className="text-muted-foreground">
                  {formatXrd(againstPower)} XRD ({againstPercentage.toFixed(1)}
                  %)
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2">
                <div
                  className="bg-red-500 dark:bg-red-400 h-full transition-all"
                  style={{ width: `${againstPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )
    })
    .render()
}
