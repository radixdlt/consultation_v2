import { Result, useAtomValue } from '@effect-atom/atom-react'
import { useState } from 'react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { accountVotesAtom } from '@/atom/accountVotesAtom'
import { AddressLink } from '@/components/AddressLink'

type VoteFilter = 'For' | 'Against' | null

function formatXrd(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toFixed(2)
}

type AccountVotesSectionProps = {
  id: TemperatureCheckId
}

export function AccountVotesSection({ id }: AccountVotesSectionProps) {
  const accountVotesResult = useAtomValue(
    accountVotesAtom('temperature_check')(id)
  )
  const [selectedVote, setSelectedVote] = useState<VoteFilter>(null)

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
              className={`px-3 py-1 text-xs font-medium border transition-colors ${
                selectedVote === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedVote('For')}
              className={`px-3 py-1 text-xs font-medium border transition-colors ${
                selectedVote === 'For'
                  ? 'bg-green-600 text-white border-transparent'
                  : 'bg-green-50 text-green-700 border-green-300 hover:opacity-80 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
              }`}
            >
              For
            </button>
            <button
              type="button"
              onClick={() => setSelectedVote('Against')}
              className={`px-3 py-1 text-xs font-medium border transition-colors ${
                selectedVote === 'Against'
                  ? 'bg-red-600 text-white border-transparent'
                  : 'bg-red-50 text-red-700 border-red-300 hover:opacity-80 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
              }`}
            >
              Against
            </button>
          </div>

          {/* Voters list */}
          <div className="space-y-3 max-h-36 overflow-y-auto">
            {filteredVoters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No voters for this option yet.
              </p>
            ) : (
              filteredVoters.map((voter) => (
                <div
                  key={`${voter.accountAddress}-${voter.vote}`}
                  className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${voter.vote === 'For' ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <AddressLink address={voter.accountAddress} prefixLength={8} suffixLength={4} className="font-mono text-xs text-muted-foreground" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {formatXrd(Number(voter.votePower))} XRD
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    })
    .render()
}
