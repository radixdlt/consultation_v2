import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { ArrowRightLeft, Check, LoaderIcon, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import type { KeyValueStoreAddress } from 'shared/schemas'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import { voteOnProposalBatchAtom } from '@/atom/proposalsAtom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import { cn } from '@/lib/utils'
import type { ProposalVotedAccount } from '../types'

type OptionButtonProps = {
  label: string
  selected: boolean
  onClick?: () => void
  disabled?: boolean
}

function OptionButton({
  label,
  selected,
  onClick,
  disabled
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-4 py-3 border transition-all duration-200 flex items-center gap-3 cursor-pointer',
        selected
          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
          : 'border-border hover:border-muted-foreground hover:bg-secondary/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'size-5 rounded-full border-2 flex items-center justify-center shrink-0',
        selected ? 'border-current bg-white/20' : 'border-current'
      )}>
        {selected && <Check className="size-3" />}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  )
}

type VotingSectionProps = {
  proposalId: ProposalId
  proposal: Proposal
  keyValueStoreAddress: KeyValueStoreAddress
  accountsVotesResult: Result.Result<ProposalVotedAccount[], unknown>
}

export function VotingSection({
  proposalId,
  proposal,
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

      let currentVoteOptions: readonly number[] | undefined
      let unvotedCount = 0

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

        currentVoteOptions = votesData?.currentVote?.options
        unvotedCount = votesData?.unvotedCount ?? 0
      }

      return (
        <ConnectedVoting
          proposalId={proposalId}
          proposal={proposal}
          keyValueStoreAddress={keyValueStoreAddress}
          accountList={accountList}
          currentVoteOptions={currentVoteOptions}
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
  proposalId: ProposalId
  proposal: Proposal
  keyValueStoreAddress: KeyValueStoreAddress
  accountList: WalletDataStateAccount[]
  currentVoteOptions?: readonly number[]
  unvotedCount: number
}

function ConnectedVoting({
  proposalId,
  proposal,
  keyValueStoreAddress,
  accountList,
  currentVoteOptions,
  unvotedCount
}: ConnectedVotingProps) {
  const [voteResult, voteBatch] = useAtom(voteOnProposalBatchAtom)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(
    new Set(currentVoteOptions ?? [])
  )
  const [voteAllAccounts, setVoteAllAccounts] = useState(false)
  const currentAccount = useCurrentAccount()

  useEffect(() => {
    if (currentVoteOptions !== undefined && !isEditing) {
      setSelectedOptions(new Set(currentVoteOptions))
    }
  }, [currentVoteOptions, isEditing])

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

  const maxSelections = proposal.maxSelections
  const hasVoted = currentVoteOptions !== undefined
  const showForm = !hasVoted || isEditing
  const currentSet = new Set(currentVoteOptions ?? [])
  const hasChanged = hasVoted && (
    selectedOptions.size !== currentSet.size ||
    [...selectedOptions].some((id) => !currentSet.has(id))
  )

  const handleOptionToggle = (optionId: number) => {
    setSelectedOptions((prev) => {
      if (prev.has(optionId)) {
        const next = new Set(prev)
        next.delete(optionId)
        return next
      }
      if (maxSelections > 1 && prev.size >= maxSelections) return prev
      return maxSelections === 1
        ? new Set([optionId])
        : new Set([...prev, optionId])
    })
  }

  const handleSubmit = () => {
    if (selectedOptions.size === 0) return

    const accountsToVote = voteAllAccounts ? accountList : [currentAccount]

    const selectedOptionLabels = proposal.voteOptions
      .filter((o) => selectedOptions.has(o.id))
      .map((o) => o.label)

    voteBatch({
      accounts: accountsToVote.filter(
        (acc): acc is WalletDataStateAccount => acc !== undefined
      ),
      proposalId,
      keyValueStoreAddress,
      optionIds: Array.from(selectedOptions),
      selectedOptionLabels
    })
  }

  const canSubmit = hasVoted
    ? hasChanged && !isSubmitting
    : selectedOptions.size > 0 && !isSubmitting

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
              setSelectedOptions(new Set(currentVoteOptions ?? []))
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {showForm && maxSelections > 1 && (
        <p className="text-sm text-muted-foreground mb-4">
          Select up to {maxSelections} options
        </p>
      )}

      <div className="flex flex-col gap-3">
        {proposal.voteOptions.map((opt) => {
          const isSelected = selectedOptions.has(opt.id)
          if (showForm) {
            return (
              <OptionButton
                key={opt.id}
                label={opt.label}
                selected={isSelected}
                onClick={() => handleOptionToggle(opt.id)}
                disabled={isSubmitting}
              />
            )
          }

          return (
            <div
              key={opt.id}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm border transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-medium'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              <span className={cn(
                'size-5 rounded-full border-2 flex items-center justify-center shrink-0',
                isSelected ? 'border-current bg-white/20' : 'border-current'
              )}>
                {isSelected && <Check className="size-3" />}
              </span>
              <span className="font-medium text-sm">{opt.label}</span>
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
                id="vote-all-proposal"
                checked={voteAllAccounts}
                onCheckedChange={(checked) => setVoteAllAccounts(checked === true)}
                disabled={isSubmitting}
              />
              <label htmlFor="vote-all-proposal" className="text-sm">
                Use all connected accounts ({accountList.length})
              </label>
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full mt-4',
              canSubmit &&
                'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 border-transparent'
            )}
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
