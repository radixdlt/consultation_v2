import { Result, useAtomValue } from '@effect-atom/atom-react'
import { ArrowRightLeft, ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn, truncateAddress } from '@/lib/utils'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import type { VotedAccount } from '../types'

type YourVotesSectionProps = {
  accountsVotesResult: Result.Result<VotedAccount[], unknown>
}

export function YourVotesSection({
  accountsVotesResult
}: YourVotesSectionProps) {
  const currentAccount = useCurrentAccount()
  const allAccountsResult = useAtomValue(accountsAtom)

  return Result.builder(accountsVotesResult)
    .onInitial(() => null)
    .onSuccess((votes) => {
      if (!currentAccount) return null

      const currentVote = votes.find(
        (v) => v.address === currentAccount.address
      )

      // Don't show section if the current account hasn't voted
      if (!currentVote) return null

      const allAccounts = Result.builder(allAccountsResult)
        .onSuccess((accounts) => accounts)
        .onInitial(() => [])
        .onFailure(() => [])
        .render()

      const unvotedCount = allAccounts.filter(
        (acc) => !votes.some((v) => v.address === acc.address)
      ).length

      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your Vote
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {currentAccount.label || 'Account'}
              </p>
              <p className="text-muted-foreground text-xs">
                {truncateAddress(currentAccount.address)}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium',
                currentVote.vote === 'For'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              )}
            >
              {currentVote.vote === 'For' ? (
                <ThumbsUp className="size-3" />
              ) : (
                <ThumbsDown className="size-3" />
              )}
              {currentVote.vote}
            </span>
          </div>

          {unvotedCount > 0 && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/50 border border-border p-2.5">
              <ArrowRightLeft className="size-3.5 shrink-0 mt-0.5" />
              <span>
                {unvotedCount === 1
                  ? '1 connected account hasn\'t voted yet. Switch accounts to cast their vote.'
                  : `${unvotedCount} connected accounts haven't voted yet. Switch accounts to cast their votes.`}
              </span>
            </div>
          )}
        </div>
      )
    })
    .render()
}
