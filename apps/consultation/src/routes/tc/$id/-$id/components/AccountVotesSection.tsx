import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { accountVotesAtom } from '@/atom/accountVotesAtom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { truncateAddress } from '@/lib/utils'

type AccountVotesSectionProps = {
  id: TemperatureCheckId
}

export function AccountVotesSection({ id }: AccountVotesSectionProps) {
  const accountVotesResult = useAtomValue(
    accountVotesAtom('temperature_check')(id)
  )

  return Result.builder(accountVotesResult)
    .onInitial(() => null)
    .onFailure(() => (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Failed to load account votes.
        </CardContent>
      </Card>
    ))
    .onSuccess((accountVotes) => {
      if (accountVotes.length === 0) return null

      return (
        <Card>
          <CardHeader>
            <CardTitle>Account Votes</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto space-y-3">
            {accountVotes.map((entry) => (
              <div
                key={`${entry.accountAddress}-${entry.vote}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-sm" title={entry.accountAddress}>
                  {truncateAddress(entry.accountAddress)}
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {entry.vote}
                </span>
                <span className="shrink-0 text-muted-foreground text-sm tabular-nums">
                  {Number(entry.votePower).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    })
    .render()
}
