import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { LoaderIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { KeyValueStoreAddress } from 'shared/schemas'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import { voteOnTemperatureCheckBatchAtom } from '@/atom/temperatureChecksAtom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import type { VotedAccount } from '../types'

type Vote = 'For' | 'Against'

type VoteButtonProps = {
  vote: Vote
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}

function VoteButton({ vote, onClick, disabled, loading }: VoteButtonProps) {
  const colorClasses =
    vote === 'For'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-rose-600 hover:bg-rose-700'

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 ${colorClasses} font-bold`}
    >
      {loading && <LoaderIcon className="size-4 animate-spin" />}
      {vote}
    </Button>
  )
}

type VoteButtonsProps = {
  onVote?: (vote: Vote) => void
  disabled?: boolean
  loadingVote?: Vote | null
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
        id="vote-all"
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        disabled={disabled}
      />
      <label htmlFor="vote-all" className="text-sm">
        Vote with all connected accounts ({accountCount})
      </label>
    </div>
  )
}

function VoteButtons({ onVote, disabled, loadingVote }: VoteButtonsProps) {
  return (
    <div className="flex gap-4">
      <VoteButton
        vote="For"
        onClick={() => onVote?.('For')}
        disabled={disabled}
        loading={loadingVote === 'For'}
      />
      <VoteButton
        vote="Against"
        onClick={() => onVote?.('Against')}
        disabled={disabled}
        loading={loadingVote === 'Against'}
      />
    </div>
  )
}

type VotingSectionProps = {
  temperatureCheckId: TemperatureCheckId
  keyValueStoreAddress: KeyValueStoreAddress
  accountsVotesResult: Result.Result<VotedAccount[], unknown>
}

export function VotingSection({
  temperatureCheckId,
  keyValueStoreAddress,
  accountsVotesResult
}: VotingSectionProps) {
  const accounts = useAtomValue(accountsAtom)

  return Result.builder(accounts)
    .onInitial(() => <VotingSkeleton />)
    .onSuccess((accountList) => {
      if (accountList.length === 0) {
        return <DisconnectedVoting />
      }

      // Check if all accounts have voted
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
          temperatureCheckId={temperatureCheckId}
          keyValueStoreAddress={keyValueStoreAddress}
          accountList={accountList}
          accountsVotesResult={accountsVotesResult}
        />
      )
    })
    .onFailure(() => <DisconnectedVoting />)
    .render()
}

function VotingSkeleton() {
  return <DisconnectedVoting />
}

function DisconnectedVoting() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cast Your Vote</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="blur-sm pointer-events-none">
            <VoteButtons disabled />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm font-medium bg-background/80 px-3 py-1.5 rounded">
              Connect wallet to vote
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type ConnectedVotingProps = {
  temperatureCheckId: TemperatureCheckId
  keyValueStoreAddress: KeyValueStoreAddress
  accountList: WalletDataStateAccount[]
  accountsVotesResult: Result.Result<VotedAccount[], unknown>
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

  const handleVote = useCallback(
    (voteChoice: Vote) => {
      setSelectedVote(voteChoice)

      const accountsToVote = voteAllAccounts
        ? accountList
        : currentAccount
          ? [currentAccount]
          : []

      voteBatch({
        accounts: accountsToVote,
        temperatureCheckId,
        keyValueStoreAddress,
        vote: voteChoice
      })
    },
    [
      accountList,
      temperatureCheckId,
      keyValueStoreAddress,
      voteBatch,
      voteAllAccounts,
      currentAccount
    ]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cast Your Vote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <VoteButtons
          onVote={handleVote}
          disabled={isSubmitting}
          loadingVote={isSubmitting ? selectedVote : null}
        />

        <VoteAllCheckbox
          checked={voteAllAccounts}
          onCheckedChange={setVoteAllAccounts}
          disabled={isSubmitting}
          accountCount={accountList.length}
        />
      </CardContent>
    </Card>
  )
}
