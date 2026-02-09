import { Result } from '@effect-atom/atom-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        <Card>
          <CardHeader>
            <CardTitle>Your Votes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                      className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {optionLabelMap.get(optionId) ?? `Option ${optionId}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    })
    .render()
}
