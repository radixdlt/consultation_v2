import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { ArrowRightLeft, Check, LoaderIcon, ThumbsDown, ThumbsUp, Wallet } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { KeyValueStoreAddress } from 'shared/schemas'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import { voteOnTemperatureCheckBatchAtom } from '@/atom/temperatureChecksAtom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
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

      let currentVote: Vote | undefined
      let unvotedCount = 0

      if (accountsVotesResult && currentAccount) {
        const votesData = Result.builder(accountsVotesResult)
          .onSuccess((votes) => ({
            currentVote: votes.find((v) => v.address === currentAccount.address)?.vote,
            unvotedCount: accountList.filter(
              (acc) => !votes.some((v) => v.address === acc.address)
            ).length
          }))
          .onInitial(() => undefined)
          .onFailure(() => undefined)
          .render()

        currentVote = votesData?.currentVote
        unvotedCount = votesData?.unvotedCount ?? 0
      }

      return (
        <ConnectedVoting
          temperatureCheckId={temperatureCheckId}
          keyValueStoreAddress={keyValueStoreAddress}
          accountList={accountList}
          currentVote={currentVote}
          unvotedCount={unvotedCount}
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

type ConnectedVotingProps = {
  temperatureCheckId: TemperatureCheckId
  keyValueStoreAddress: KeyValueStoreAddress
  accountList: WalletDataStateAccount[]
  currentVote?: Vote
  unvotedCount: number
}

function ConnectedVoting({
  temperatureCheckId,
  keyValueStoreAddress,
  accountList,
  currentVote,
  unvotedCount
}: ConnectedVotingProps) {
  const [voteResult, voteBatch] = useAtom(voteOnTemperatureCheckBatchAtom)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedVote, setSelectedVote] = useState<Vote | null>(currentVote ?? null)
  const [voteAllAccounts, setVoteAllAccounts] = useState(false)
  const currentAccount = useCurrentAccount()

  useEffect(() => {
    if (currentVote !== undefined && !isEditing) {
      setSelectedVote(currentVote)
    }
  }, [currentVote, isEditing])

  const wasSubmittingRef = useRef(false)
  const isSubmitting = voteResult.waiting

  useEffect(() => {
    if (isSubmitting) {
      wasSubmittingRef.current = true
    } else if (wasSubmittingRef.current) {
      wasSubmittingRef.current = false
      // Only close edit form if submission succeeded with at least one successful vote
      const succeeded = Result.builder(voteResult)
        .onSuccess((results) => results.some((r) => r.success))
        .onInitial(() => false)
        .onFailure(() => false)
        .render()
      if (succeeded) {
        setIsEditing(false)
      }
    }
  }, [isSubmitting, voteResult])

  const hasVoted = currentVote !== undefined
  const showForm = !hasVoted || isEditing
  const hasChanged = selectedVote !== null && selectedVote !== currentVote

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {hasVoted ? 'Your Vote' : 'Cast your Vote'}
        </h3>
        {hasVoted && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Change vote
          </button>
        )}
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setSelectedVote(currentVote ?? null)
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {(['For', 'Against'] as const).map((opt) => {
          const isSelected = selectedVote === opt
          if (showForm) {
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedVote(opt)}
                disabled={isSubmitting}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-medium'
                    : 'bg-transparent border-border text-foreground hover:border-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <span className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-current bg-white/20' : 'border-current'
                }`}>
                  {isSelected && <Check className="size-3" />}
                </span>
                <span className="flex items-center gap-2">
                  {opt === 'For' ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
                  {opt.toUpperCase()}
                </span>
              </button>
            )
          }

          return (
            <div
              key={opt}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm border transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-medium'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              <span className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'border-current bg-white/20' : 'border-current'
              }`}>
                {isSelected && <Check className="size-3" />}
              </span>
              <span className="flex items-center gap-2">
                {opt === 'For' ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
                {opt.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>

      {showForm && (
        <>
          {/* Hidden on mobile: deep linking opens the wallet app, breaking multi-account flow */}
          {accountList.length >= 2 && (
            <div className="hidden lg:flex items-center space-x-2 mt-4">
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
            disabled={!selectedVote || isSubmitting || (hasVoted && !hasChanged)}
            className={`w-full mt-4 ${(hasChanged || (!hasVoted && selectedVote)) ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 border-transparent' : ''}`}
          >
            {isSubmitting && <LoaderIcon className="size-4 animate-spin" />}
            {hasVoted ? 'Change Vote' : 'Sign Transaction'}
          </Button>
        </>
      )}

      {hasVoted && unvotedCount > 0 && !isEditing && (
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
