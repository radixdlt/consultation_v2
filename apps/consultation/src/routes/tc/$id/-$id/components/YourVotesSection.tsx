import { Result } from '@effect-atom/atom-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, truncateAddress } from '@/lib/utils'
import type { VotedAccount } from '../types'

type YourVotesSectionProps = {
  accountsVotesResult: Result.Result<VotedAccount[], unknown>
}

export function YourVotesSection({
  accountsVotesResult
}: YourVotesSectionProps) {
  return Result.builder(accountsVotesResult)
    .onInitial(() => null)
    .onSuccess((votes) => {
      if (votes.length === 0) return null

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
                <span
                  className={cn(
                    'shrink-0 rounded px-2 py-0.5 text-xs font-medium',
                    vote.vote === 'For'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  )}
                >
                  {vote.vote}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    })
    .render()
}
