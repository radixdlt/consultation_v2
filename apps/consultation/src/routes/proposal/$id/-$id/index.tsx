import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import { getProposalByIdAtom, getProposalVotesByAccountsAtom } from '@/atom/proposalsAtom'
import { AccountVotesSection } from '@/components/detail/AccountVotesSection'
import { DetailPageDetails } from '@/components/detail/DetailPageDetails'
import { DetailPageHeader } from '@/components/detail/DetailPageHeader'
import { DetailPageLayout } from '@/components/detail/DetailPageLayout'
import { HideToggle } from '@/components/detail/HideToggle'
import { OriginBadge } from '@/components/detail/OriginBadge'
import { QuorumBadge } from '@/components/detail/QuorumBadge'
import { VoteResultsSection } from '@/components/detail/VoteResultsSection'
import { InlineCode } from '@/components/ui/typography'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { getItemStatus } from '@/routes/-index/components/StatusBadge'
import { SidebarContent } from './components/SidebarContent'
import { VotingSection } from './components/VotingSection'

export function Page({ id }: { id: ProposalId }) {
  const proposal = useAtomValue(getProposalByIdAtom(id))

  return Result.builder(proposal)
    .onInitial(() => {
      return <div>Loading...</div>
    })
    .onSuccess((p) => <PageContent proposal={p} id={id} />)
    .onFailure((error) => {
      return <InlineCode>{Cause.pretty(error)}</InlineCode>
    })
    .render()
}

function PageContent({ proposal, id }: { proposal: Proposal; id: ProposalId }) {
  const isAdmin = useIsAdmin()

  if (proposal.hidden && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <p className="text-lg font-medium">This proposal has been hidden.</p>
      </div>
    )
  }

  return <PageContentInner proposal={proposal} id={id} isAdmin={isAdmin} />
}

function PageContentInner({
  proposal,
  id,
  isAdmin
}: { proposal: Proposal; id: ProposalId; isAdmin: boolean }) {
  const status = getItemStatus(proposal.deadline)
  const accountsVotesResult = useAtomValue(
    getProposalVotesByAccountsAtom(proposal.voters)
  )

  const header = (
    <DetailPageHeader
      status={status}
      typeBadge="GP"
      id={proposal.id}
      title={proposal.title}
      start={proposal.start}
      deadline={proposal.deadline}
      author={proposal.author}
      links={proposal.links.map((l) => l.toString())}
      quorumBadge={
        <QuorumBadge entityType="proposal" entityId={id} quorum={Number(proposal.quorum)} />
      }
      originBadge={
        <div className="flex items-center gap-2">
          <OriginBadge type="tc" id={proposal.temperatureCheckId} />
          <HideToggle type="proposal" id={id} hidden={proposal.hidden} />
        </div>
      }
    />
  )

  const details = (
    <>
      {proposal.hidden && isAdmin && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
          This proposal is hidden from public view.
        </div>
      )}
      <DetailPageDetails
        shortDescription={proposal.shortDescription}
        description={proposal.description}
        filename={`proposal-${proposal.id}-details.md`}
      />
    </>
  )

  const resultsContent = (
    <>
      <VoteResultsSection
        entityType="proposal"
        entityId={id}
        voteOptions={proposal.voteOptions}
      />
      <AccountVotesSection
        entityType="proposal"
        entityId={id}
        voteOptions={proposal.voteOptions}
      />
    </>
  )

  const votingContent = (
    <VotingSection
      proposalId={id}
      proposal={proposal}
      keyValueStoreAddress={proposal.voters}
      accountsVotesResult={accountsVotesResult}
    />
  )

  const sidebar = (
    <SidebarContent
      proposal={proposal}
      id={id}
      accountsVotesResult={accountsVotesResult}
    />
  )

  return (
    <DetailPageLayout
      header={header}
      details={details}
      sidebar={sidebar}
      resultsContent={resultsContent}
      votingContent={votingContent}
    />
  )
}
