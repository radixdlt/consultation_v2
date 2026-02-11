import { Result, useAtomMount, useAtomValue } from '@effect-atom/atom-react'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { voteResultsAtom, voteUpdatesAtom } from '@/atom/voteResultsAtom'
import { formatXrd } from '@/lib/utils'

type VoteOption = { readonly id: number; readonly label: string }

type BarColor = {
  bar: string
  text: string
}

const TC_COLORS: Record<string, BarColor> = {
  For: {
    bar: 'bg-green-600 dark:bg-green-500',
    text: ''
  },
  Against: {
    bar: 'bg-red-500 dark:bg-red-400',
    text: ''
  }
}

const NEUTRAL_COLOR: BarColor = {
  bar: 'bg-neutral-800 dark:bg-neutral-200',
  text: ''
}

type VoteResultsSectionProps = {
  entityType: EntityType
  entityId: EntityId
  voteOptions: readonly VoteOption[]
  colorMap?: Record<string, BarColor>
}

export function VoteResultsSection({
  entityType,
  entityId,
  voteOptions,
  colorMap
}: VoteResultsSectionProps) {
  useAtomMount(voteUpdatesAtom(entityType)(entityId))
  const voteResultsResult = useAtomValue(
    voteResultsAtom(entityType)(entityId)
  )

  const isTc = entityType === 'temperature_check'
  const resolvedColorMap = colorMap ?? (isTc ? TC_COLORS : undefined)

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

      const voteKey = (opt: VoteOption) =>
        isTc ? opt.label : String(opt.id)

      const allOptions = voteOptions.map((opt) => ({
        key: voteKey(opt),
        label: opt.label,
        power: resultMap.get(voteKey(opt)) ?? 0
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

              const colors = resolvedColorMap?.[option.label] ?? NEUTRAL_COLOR

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
                      className={`${colors.bar} h-full transition-all`}
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
