import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { ArrowRightLeft, Check, CheckCircle, LoaderIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import type { KeyValueStoreAddress } from 'shared/schemas'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import { voteOnProposalBatchAtom } from '@/atom/proposalsAtom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import { cn } from '@/lib/utils'
import { getProposalVoteColor } from '@/lib/voting'
import type { VoteOption } from '@/lib/voting'
import type { ProposalVotedAccount } from '../types'

type OptionButtonProps = {
  label: string
  selected: boolean
  selectedClass: string
  onClick?: () => void
  disabled?: boolean
}

function OptionButton({
  label,
  selected,
  selectedClass,
  onClick,
  disabled
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-4 py-3 border transition-all duration-150 flex items-center justify-between cursor-pointer',
        selected
          ? `${selectedClass} font-medium`
          : 'border-border hover:border-muted-foreground hover:bg-secondary/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="font-medium text-sm">{label}</span>
      {selected && <Check className="size-4 shrink-0" />}
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
              currentVote={votesData.currentVote}
              voteOptions={proposal.voteOptions}
              unvotedCount={votesData.unvotedCount}
            />
          )
        }
      }

      return (
        <ConnectedVoting
          proposalId={proposalId}
          proposal={proposal}
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
  currentVote: ProposalVotedAccount
  voteOptions: readonly VoteOption[]
  unvotedCount: number
}

function AlreadyVotedDisplay({ currentVote, voteOptions, unvotedCount }: AlreadyVotedDisplayProps) {
  const votedOptionIds = new Set(currentVote.options)

  return (
    <div className="bg-secondary/50 border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Your Vote
      </h3>
      <div className="flex flex-col gap-3">
        {voteOptions.map((opt, index) => {
          const isVoted = votedOptionIds.has(opt.id)
          const color = getProposalVoteColor(index)
          return (
            <div
              key={opt.id}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm border transition-all ${
                isVoted
                  ? `${color.selected} font-medium`
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                {opt.label}
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
  proposalId: ProposalId
  proposal: Proposal
  keyValueStoreAddress: KeyValueStoreAddress
  accountList: WalletDataStateAccount[]
}

function ConnectedVoting({
  proposalId,
  proposal,
  keyValueStoreAddress,
  accountList
}: ConnectedVotingProps) {
  const [voteResult, voteBatch] = useAtom(voteOnProposalBatchAtom)
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set())
  const [voteAllAccounts, setVoteAllAccounts] = useState(
    accountList.length >= 2
  )
  const currentAccount = useCurrentAccount()

  const isSubmitting = voteResult.waiting
  const maxSelections = proposal.maxSelections

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

  return (
    <div className="bg-secondary/50 border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Cast your Vote
      </h3>

      {maxSelections > 1 && (
        <p className="text-sm text-muted-foreground mb-4">
          Select up to {maxSelections} options
        </p>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {proposal.voteOptions.map((option, index) => (
          <OptionButton
            key={option.id}
            label={option.label}
            selected={selectedOptions.has(option.id)}
            selectedClass={getProposalVoteColor(index).selected}
            onClick={() => handleOptionToggle(option.id)}
            disabled={isSubmitting}
          />
        ))}
      </div>

      {accountList.length >= 2 && (
        <div className="flex items-center space-x-2 mb-4">
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
        disabled={isSubmitting || selectedOptions.size === 0}
        className={cn(
          'w-full',
          selectedOptions.size > 0 &&
            'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 border-transparent'
        )}
      >
        {isSubmitting && <LoaderIcon className="size-4 animate-spin" />}
        Sign Transaction
      </Button>
    </div>
  )
}
