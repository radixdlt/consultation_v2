import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import { useNavigate } from '@tanstack/react-router'
import { Option } from 'effect'
import { ArrowUpRight, LoaderIcon } from 'lucide-react'
import { useCallback } from 'react'
import type {
  ProposalId,
  TemperatureCheckId
} from 'shared/governance/brandedTypes'
import { isAdminAtom, promoteToProposalAtom } from '@/atom/adminAtom'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'

type PromoteToProposalProps = {
  temperatureCheckId: TemperatureCheckId
  elevatedProposalId: Option.Option<ProposalId>
}

export function PromoteToProposal({
  temperatureCheckId,
  elevatedProposalId
}: PromoteToProposalProps) {
  if (Option.isSome(elevatedProposalId)) {
    return <ElevatedBanner proposalId={elevatedProposalId.value} />
  }

  return <AdminPromoteBadge temperatureCheckId={temperatureCheckId} />
}

function ElevatedBanner({ proposalId }: { proposalId: ProposalId }) {
  const navigate = useNavigate()

  const handleNavigate = useCallback(() => {
    navigate({ to: '/proposal/$id', params: { id: String(proposalId) } })
  }, [navigate, proposalId])

  return (
    <button
      type="button"
      onClick={handleNavigate}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:text-foreground transition-colors cursor-pointer"
    >
      Elevated to GP #{String(proposalId)}
      <ArrowUpRight className="size-3" />
    </button>
  )
}

function AdminPromoteBadge({
  temperatureCheckId
}: {
  temperatureCheckId: TemperatureCheckId
}) {
  const currentAccount = useCurrentAccount()

  if (!currentAccount) return null

  return (
    <AdminPromoteBadgeWithAddress
      temperatureCheckId={temperatureCheckId}
      accountAddress={currentAccount.address}
    />
  )
}

function AdminPromoteBadgeWithAddress({
  temperatureCheckId,
  accountAddress
}: {
  temperatureCheckId: TemperatureCheckId
  accountAddress: string
}) {
  const isAdminResult = useAtomValue(isAdminAtom(accountAddress))

  return Result.builder(isAdminResult)
    .onInitial(() => null)
    .onFailure(() => null)
    .onSuccess((isAdmin) => {
      if (!isAdmin) return null

      return <PromoteBadge temperatureCheckId={temperatureCheckId} />
    })
    .render()
}

function PromoteBadge({
  temperatureCheckId
}: {
  temperatureCheckId: TemperatureCheckId
}) {
  const [promoteResult, promote] = useAtom(promoteToProposalAtom)

  const isSubmitting = promoteResult.waiting

  const handlePromote = useCallback(() => {
    promote(temperatureCheckId)
  }, [promote, temperatureCheckId])

  return (
    <button
      type="button"
      onClick={handlePromote}
      disabled={isSubmitting}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors cursor-pointer disabled:opacity-50"
    >
      {isSubmitting ? (
        <LoaderIcon className="size-3 animate-spin" />
      ) : (
        <ArrowUpRight className="size-3" />
      )}
      Promote to GP
    </button>
  )
}
