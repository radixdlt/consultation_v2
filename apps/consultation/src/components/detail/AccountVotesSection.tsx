import { Result, useAtomValue } from '@effect-atom/atom-react'
import { useState } from 'react'
import type { EntityId, EntityType } from 'shared/governance/brandedTypes'
import { accountVotesAtom } from '@/atom/accountVotesAtom'
import { AddressLink } from '@/components/AddressLink'
import { Skeleton } from '@/components/ui/skeleton'
import { formatXrd } from '@/lib/utils'
import type { VoteOption } from '@/lib/voting'
import { resolveVoteOptions } from '@/lib/voting'

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

  const filterOptions = resolveVoteOptions(entityType, voteOptions)
  const letterByKey = new Map(
    filterOptions.map((f, i) => [f.key, String.fromCharCode(65 + i)])
  )

  return Result.builder(accountVotesResult)
    .onInitial(() => (
      <div className="bg-card border border-border p-6 shadow-sm">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-14" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="size-2 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    ))
    .onFailure(() => (
      <div className="bg-card border border-border p-6 shadow-sm">
        <div className="py-4 text-sm text-muted-foreground">
          Failed to load account votes.
        </div>
      </div>
    ))
    .onSuccess((accountVotes) => {
      if (accountVotes.length === 0) {
        return (
          <div className="bg-card border border-border p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Voters (0)
            </h3>
            <p className="text-sm text-muted-foreground">
              No voters yet.
            </p>
          </div>
        )
      }

      const sortedVoters = [...accountVotes].sort((a, b) => {
        return Number(b.votePower) - Number(a.votePower)
      })

      const filteredCount =
        selectedVote === null
          ? sortedVoters.length
          : sortedVoters.filter((v) => v.vote === selectedVote).length

      return (
        <div className="bg-card border border-border p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Voters ({filteredCount}
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
            {filterOptions.map((opt, i) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedVote(opt.key)}
                className={`px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                  selectedVote === opt.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'
                }`}
              >
                {String.fromCharCode(65 + i)}: {opt.label}
              </button>
            ))}
          </div>

          {/* Voters list */}
          <div className="max-h-72 overflow-y-auto pr-2">
            {filteredCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                No voters for this option yet.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedVoters
                  .filter((v) => selectedVote === null || v.vote === selectedVote)
                  .map((voter, index, filtered) => {
                    const letter = letterByKey.get(voter.vote) ?? '?'
                    const isLast = index === filtered.length - 1

                    return (
                      <div
                        key={`${voter.accountAddress}-${voter.vote}`}
                        className={`flex items-center justify-between text-sm pb-2 ${isLast ? '' : 'border-b border-border/50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground font-mono w-4 shrink-0">
                            {letter}
                          </span>
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
                  })}
              </div>
            )}
          </div>
        </div>
      )
    })
    .render()
}
