import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { Check, LoaderIcon } from 'lucide-react'
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
import type { ProposalVotedAccount, VoteOption } from '../types'

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
        'w-full text-left px-4 py-3 border transition-all duration-150 flex items-center justify-between',
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'border-border hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="font-medium text-sm">{label}</span>
      {selected && <Check className="size-4 shrink-0" />}
    </button>
  )
}

type VoteAllCheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  accountCount: number
}

function VoteAllCheckbox({
  checked,
  onCheckedChange,
  disabled,
  accountCount
}: VoteAllCheckboxProps) {
  if (accountCount < 2) return null

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="vote-all-proposal"
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        disabled={disabled}
      />
      <label htmlFor="vote-all-proposal" className="text-sm">
        Vote with all connected accounts ({accountCount})
      </label>
    </div>
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

  return Result.builder(accounts)
    .onInitial(() => <VotingSkeleton voteOptions={proposal.voteOptions} />)
    .onSuccess((accountList) => {
      if (accountList.length === 0) {
        return <DisconnectedVoting voteOptions={proposal.voteOptions} />
      }

      const allAccountsVoted = Result.builder(accountsVotesResult)
        .onSuccess(
          (votes) =>
            accountList.length > 0 &&
            accountList.every((acc) =>
              votes.some((v) => v.address === acc.address)
            )
        )
        .onInitial(() => false)
        .onFailure(() => false)
        .render()

      if (allAccountsVoted) return null

      return (
        <ConnectedVoting
          proposalId={proposalId}
          proposal={proposal}
          keyValueStoreAddress={keyValueStoreAddress}
          accountList={accountList}
          accountsVotesResult={accountsVotesResult}
        />
      )
    })
    .onFailure(() => <DisconnectedVoting voteOptions={proposal.voteOptions} />)
    .render()
}

function VotingSkeleton({
  voteOptions
}: {
  voteOptions: readonly VoteOption[]
}) {
  return <DisconnectedVoting voteOptions={voteOptions} />
}

function DisconnectedVoting({
  voteOptions
}: {
  voteOptions: readonly VoteOption[]
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Cast Your Vote
      </h3>
      <div className="relative">
        <div className="blur-sm pointer-events-none space-y-2">
          {voteOptions.map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              selected={false}
              disabled
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-medium bg-background/80 px-3 py-1.5">
            Connect wallet to vote
          </p>
        </div>
      </div>
    </div>
  )
}

type ConnectedVotingProps = {
  proposalId: ProposalId
  proposal: Proposal
  keyValueStoreAddress: KeyValueStoreAddress
  accountList: WalletDataStateAccount[]
  accountsVotesResult: Result.Result<ProposalVotedAccount[], unknown>
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

    voteBatch({
      accounts: accountsToVote.filter(
        (acc): acc is WalletDataStateAccount => acc !== undefined
      ),
      proposalId,
      keyValueStoreAddress,
      optionIds: Array.from(selectedOptions)
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Cast Your Vote
      </h3>
      {maxSelections > 1 && (
        <p className="text-sm text-muted-foreground">
          Select up to {maxSelections} options
        </p>
      )}
      <div className="space-y-2">
        {proposal.voteOptions.map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            selected={selectedOptions.has(option.id)}
            onClick={() => handleOptionToggle(option.id)}
            disabled={isSubmitting}
          />
        ))}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedOptions.size === 0}
        className={cn(
          'w-full',
          selectedOptions.size > 0 &&
            'bg-emerald-600 text-white hover:bg-emerald-700'
        )}
      >
        {isSubmitting && <LoaderIcon className="size-4 animate-spin" />}
        Submit Vote
      </Button>

      <VoteAllCheckbox
        checked={voteAllAccounts}
        onCheckedChange={setVoteAllAccounts}
        disabled={isSubmitting}
        accountCount={accountList.length}
      />
    </div>
  )
}
