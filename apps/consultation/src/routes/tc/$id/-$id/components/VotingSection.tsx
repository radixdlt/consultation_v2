import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { ArrowRightLeft, Check, CheckCircle, LoaderIcon, ThumbsDown, ThumbsUp, Wallet } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { KeyValueStoreAddress } from 'shared/schemas'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import { voteOnTemperatureCheckBatchAtom } from '@/atom/temperatureChecksAtom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import { getTcVoteColor } from '@/lib/voteColors'
import type { VotedAccount } from '../types'

type Vote = 'For' | 'Against'

type VotingSectionProps = {
  temperatureCheckId: TemperatureCheckId
  keyValueStoreAddress: KeyValueStoreAddress
  accountsVotesResult: Result.Result<VotedAccount[], unknown> | undefined
}

export function VotingSection({
  temperatureCheckId,
  keyValueStoreAddress,
  accountsVotesResult
}: VotingSectionProps) {
  const accounts = useAtomValue(accountsAtom)
  const currentAccount = useCurrentAccount()

  return Result.builder(accounts)
    .onInitial(() => <DisconnectedVoting />)
    .onSuccess((accountList) => {
      if (accountList.length === 0) {
        return <DisconnectedVoting />
      }

      if (accountsVotesResult && currentAccount) {
        const votesData = Result.builder(accountsVotesResult)
          .onSuccess((votes) => ({
            currentVote: votes.find((v) => v.address === currentAccount.address),
            unvotedCount: accountList.filter(
              (acc) => !votes.some((v) => v.address === acc.address)
            ).length
          }))
          .onInitial(() => undefined)
          .onFailure(() => undefined)
          .render()

        if (votesData?.currentVote) {
          return (
            <AlreadyVotedDisplay
              vote={votesData.currentVote.vote}
              unvotedCount={votesData.unvotedCount}
            />
          )
        }
      }

      return (
        <ConnectedVoting
          temperatureCheckId={temperatureCheckId}
          keyValueStoreAddress={keyValueStoreAddress}
          accountList={accountList}
        />
      )
    })
    .onFailure(() => <DisconnectedVoting />)
    .render()
}

function DisconnectedVoting() {
  return (
    <div className="bg-secondary/50 border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Cast your Vote
      </h3>
      <div className="text-center py-6">
        <Wallet className="size-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Connect your wallet to vote.
        </p>
      </div>
    </div>
  )
}

type AlreadyVotedDisplayProps = {
  vote: 'For' | 'Against'
  unvotedCount: number
}

function AlreadyVotedDisplay({ vote, unvotedCount }: AlreadyVotedDisplayProps) {
  return (
    <div className="bg-secondary/50 border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Your Vote
      </h3>
      <div className="flex flex-col gap-3">
        {(['For', 'Against'] as const).map((opt) => {
          const isVoted = vote === opt
          const color = getTcVoteColor(opt)
          return (
            <div
              key={opt}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm border transition-all ${
                isVoted
                  ? `${color.selected} font-medium`
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                {opt === 'For' ? (
                  <ThumbsUp className="size-4" />
                ) : (
                  <ThumbsDown className="size-4" />
                )}
                {opt.toUpperCase()}
              </span>
              {isVoted && <CheckCircle className="size-4" />}
            </div>
          )
        })}
      </div>

      {unvotedCount > 0 && (
        <div className="flex items-start gap-2 mt-4 text-xs text-muted-foreground bg-secondary/80 border border-border p-2.5">
          <ArrowRightLeft className="size-3.5 shrink-0 mt-0.5" />
          <span>
            {unvotedCount === 1
              ? 'You have 1 connected account that hasn\'t voted yet. Switch accounts to cast their vote.'
              : `You have ${unvotedCount} connected accounts that haven't voted yet. Switch accounts to cast their votes.`}
          </span>
        </div>
      )}
    </div>
  )
}

type ConnectedVotingProps = {
  temperatureCheckId: TemperatureCheckId
  keyValueStoreAddress: KeyValueStoreAddress
  accountList: WalletDataStateAccount[]
}

function ConnectedVoting({
  temperatureCheckId,
  keyValueStoreAddress,
  accountList
}: ConnectedVotingProps) {
  const [voteResult, voteBatch] = useAtom(voteOnTemperatureCheckBatchAtom)
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null)
  const [voteAllAccounts, setVoteAllAccounts] = useState(
    accountList.length >= 2
  )
  const currentAccount = useCurrentAccount()

  const isSubmitting = voteResult.waiting

  const handleVote = useCallback(() => {
    if (!selectedVote) return

    const accountsToVote = voteAllAccounts
      ? accountList
      : currentAccount
        ? [currentAccount]
        : []

    voteBatch({
      accounts: accountsToVote,
      temperatureCheckId,
      keyValueStoreAddress,
      vote: selectedVote
    })
  }, [
    accountList,
    temperatureCheckId,
    keyValueStoreAddress,
    voteBatch,
    voteAllAccounts,
    currentAccount,
    selectedVote
  ])

  return (
    <div className="bg-secondary/50 border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Cast your Vote
      </h3>

      <div className="flex flex-col gap-3 mb-4">
        {(['For', 'Against'] as const).map((opt) => {
          const isSelected = selectedVote === opt
          const color = getTcVoteColor(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelectedVote(opt)}
              disabled={isSubmitting}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm border transition-all cursor-pointer ${
                isSelected
                  ? `${color.selected} font-medium`
                  : 'bg-transparent border-border text-foreground hover:border-muted-foreground hover:bg-secondary/50'
              }`}
            >
              <span className="flex items-center gap-2">
                {opt === 'For' ? (
                  <ThumbsUp className="size-4" />
                ) : (
                  <ThumbsDown className="size-4" />
                )}
                {opt.toUpperCase()}
              </span>
              {isSelected && <Check className="size-4" />}
            </button>
          )
        })}
      </div>

      {accountList.length >= 2 && (
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="vote-all"
            checked={voteAllAccounts}
            onCheckedChange={(checked) => setVoteAllAccounts(checked === true)}
            disabled={isSubmitting}
          />
          <label htmlFor="vote-all" className="text-sm">
            Use all connected accounts ({accountList.length})
          </label>
        </div>
      )}

      <Button
        type="button"
        onClick={handleVote}
        disabled={!selectedVote || isSubmitting}
        className={`w-full ${selectedVote ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 border-transparent' : ''}`}
      >
        {isSubmitting && <LoaderIcon className="size-4 animate-spin" />}
        Sign Transaction
      </Button>
    </div>
  )
}
