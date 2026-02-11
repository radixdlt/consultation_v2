import { Result } from '@effect-atom/atom-react'
import { truncateAddress } from '@/lib/utils'
import type { ProposalVotedAccount, VoteOption } from '../types'

type YourVotesSectionProps = {
  accountsVotesResult: Result.Result<ProposalVotedAccount[], unknown>
  voteOptions: readonly VoteOption[]
}

export function YourVotesSection({
  accountsVotesResult,
  voteOptions
}: YourVotesSectionProps) {
  return Result.builder(accountsVotesResult)
    .onInitial(() => null)
    .onSuccess((votes) => {
      if (votes.length === 0) return null

      const optionLabelMap = new Map(
        voteOptions.map((opt) => [opt.id, opt.label])
      )

      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your Votes
          </h3>
          <div className="space-y-3">
            {votes.map((vote) => (
              <div
                key={vote.address}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{vote.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {truncateAddress(vote.address)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {vote.options.map((optionId) => (
                    <span
                      key={optionId}
                      className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-foreground"
                    >
                      {optionLabelMap.get(optionId) ?? `Option ${optionId}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    })
    .render()
}
