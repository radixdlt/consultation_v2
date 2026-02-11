import { Result, useAtomValue } from '@effect-atom/atom-react'
import { useState } from 'react'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { accountVotesAtom } from '@/atom/accountVotesAtom'
import { AddressLink } from '@/components/AddressLink'
import { formatXrd } from '@/lib/utils'

type VoteOption = { readonly id: number; readonly label: string }

type FilterButtonConfig = {
  key: string
  label: string
  activeClass: string
  inactiveClass: string
  dotClass?: string
}

function buildFilterButtons(
  entityType: EntityType,
  voteOptions: readonly VoteOption[]
): FilterButtonConfig[] {
  if (entityType === 'temperature_check') {
    return [
      {
        key: 'For',
        label: 'For',
        activeClass: 'bg-green-600 text-white border-transparent',
        inactiveClass:
          'bg-green-50 text-green-700 border-green-300 hover:opacity-80 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
        dotClass: 'bg-green-500'
      },
      {
        key: 'Against',
        label: 'Against',
        activeClass: 'bg-red-600 text-white border-transparent',
        inactiveClass:
          'bg-red-50 text-red-700 border-red-300 hover:opacity-80 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
        dotClass: 'bg-red-500'
      }
    ]
  }

  return voteOptions.map((opt) => ({
    key: String(opt.id),
    label: opt.label,
    activeClass: 'bg-primary text-primary-foreground border-primary',
    inactiveClass:
      'bg-transparent text-muted-foreground border-border hover:border-muted-foreground',
    dotClass: 'bg-neutral-500'
  }))
}

type AccountVotesSectionProps = {
  entityType: EntityType
  entityId: EntityId
  voteOptions: readonly VoteOption[]
}

export function AccountVotesSection({
  entityType,
  entityId,
  voteOptions
}: AccountVotesSectionProps) {
  const accountVotesResult = useAtomValue(
    accountVotesAtom(entityType)(entityId)
  )
  const [selectedVote, setSelectedVote] = useState<string | null>(null)
  const filterButtons = buildFilterButtons(entityType, voteOptions)

  return Result.builder(accountVotesResult)
    .onInitial(() => null)
    .onFailure(() => (
      <div className="bg-card border border-border p-6 shadow-sm">
        <div className="py-4 text-sm text-muted-foreground">
          Failed to load account votes.
        </div>
      </div>
    ))
    .onSuccess((accountVotes) => {
      if (accountVotes.length === 0) return null

      const sortedVoters = [...accountVotes].sort((a, b) => {
        return Number(b.votePower) - Number(a.votePower)
      })

      const filteredVoters =
        selectedVote === null
          ? sortedVoters
          : sortedVoters.filter((v) => v.vote === selectedVote)

      return (
        <div className="bg-card border border-border p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Voters ({filteredVoters.length}
            {selectedVote !== null ? ` / ${accountVotes.length}` : ''})
          </h3>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedVote(null)}
              className={`px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                selectedVote === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'
              }`}
            >
              All
            </button>
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setSelectedVote(btn.key)}
                className={`px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                  selectedVote === btn.key ? btn.activeClass : btn.inactiveClass
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Voters list */}
          <div className="space-y-3 max-h-36 overflow-y-auto">
            {filteredVoters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No voters for this option yet.
              </p>
            ) : (
              filteredVoters.map((voter) => {
                const dotColor =
                  filterButtons.find((b) => b.key === voter.vote)?.dotClass ??
                  'bg-neutral-500'

                return (
                  <div
                    key={`${voter.accountAddress}-${voter.vote}`}
                    className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${dotColor}`}
                      />
                      <AddressLink
                        address={voter.accountAddress}
                        prefixLength={8}
                        suffixLength={4}
                        className="font-mono text-xs text-muted-foreground"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {formatXrd(Number(voter.votePower))} XRD
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )
    })
    .render()
}
