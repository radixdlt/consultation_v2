import { Result, useAtomMount, useAtomValue } from '@effect-atom/atom-react'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { voteResultsAtom, voteUpdatesAtom } from '@/atom/voteResultsAtom'
import { Skeleton } from '@/components/ui/skeleton'
import { formatXrd } from '@/lib/utils'
import { getProposalVoteColor, getTcVoteColor } from '@/lib/voteColors'

type VoteOption = { readonly id: number; readonly label: string }

type VoteResultsSectionProps = {
  entityType: EntityType
  entityId: EntityId
  voteOptions: readonly VoteOption[]
}

export function VoteResultsSection({
  entityType,
  entityId,
  voteOptions
}: VoteResultsSectionProps) {
  useAtomMount(voteUpdatesAtom(entityType)(entityId))
  const voteResultsResult = useAtomValue(
    voteResultsAtom(entityType)(entityId)
  )

  const isTc = entityType === 'temperature_check'

  return Result.builder(voteResultsResult)
    .onInitial(() => (
      <div className="bg-card border border-border p-6 shadow-sm">
        <div className="mb-6">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    ))
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

      const voteKey = (opt: VoteOption) =>
        isTc ? opt.label : String(opt.id)

      const allOptions = voteOptions.map((opt, index) => ({
        key: voteKey(opt),
        label: opt.label,
        power: resultMap.get(voteKey(opt)) ?? 0,
        color: isTc
          ? getTcVoteColor(opt.label)
          : getProposalVoteColor(index)
      }))

      return (
        <div className="bg-card border border-border p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Current Results
            </h3>
          </div>

          <div className="space-y-4">
            {allOptions.map((option) => {
              const percentage =
                totalVotePower > 0
                  ? (option.power / totalVotePower) * 100
                  : 0

              return (
                <div key={option.key}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-muted-foreground">
                      {formatXrd(option.power)} XRD ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2">
                    <div
                      className={`${option.color.bar} h-full transition-all`}
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
