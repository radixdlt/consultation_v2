import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import { getProposalByIdAtom, getProposalVotesByAccountsAtom } from '@/atom/proposalsAtom'
import { AccountVotesSection } from '@/components/detail/AccountVotesSection'
import { DetailPageDetails } from '@/components/detail/DetailPageDetails'
import { DetailPageHeader } from '@/components/detail/DetailPageHeader'
import { DetailPageLayout } from '@/components/detail/DetailPageLayout'
import { OriginBadge } from '@/components/detail/OriginBadge'
import { QuorumBadge } from '@/components/detail/QuorumBadge'
import { VoteResultsSection } from '@/components/detail/VoteResultsSection'
import { InlineCode } from '@/components/ui/typography'
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
        <OriginBadge type="tc" id={proposal.temperatureCheckId} />
      }
    />
  )

  const details = (
    <DetailPageDetails
      shortDescription={proposal.shortDescription}
      description={proposal.description}
      filename={`proposal-${proposal.id}-details.md`}
    />
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
