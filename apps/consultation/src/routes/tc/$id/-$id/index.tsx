import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { TemperatureCheckSchema } from 'shared/governance/schemas'
import { getTemperatureCheckByIdAtom, getTemperatureCheckVotesByAccountsAtom } from '@/atom/temperatureChecksAtom'
import { AccountVotesSection } from '@/components/detail/AccountVotesSection'
import { DetailPageDetails } from '@/components/detail/DetailPageDetails'
import { DetailPageHeader } from '@/components/detail/DetailPageHeader'
import { DetailPageLayout } from '@/components/detail/DetailPageLayout'
import { QuorumBadge } from '@/components/detail/QuorumBadge'
import { VoteResultsSection } from '@/components/detail/VoteResultsSection'
import { InlineCode } from '@/components/ui/typography'
import { TC_VOTE_OPTIONS } from '@/lib/voting'
import { getItemStatus } from '@/routes/-index/components/StatusBadge'
import { PromoteToProposal } from './components/PromoteToProposal'
import { SidebarContent } from './components/SidebarContent'
import { VotingSection } from './components/VotingSection'

type TemperatureCheck = typeof TemperatureCheckSchema.Type

export function Page({ id }: { id: TemperatureCheckId }) {
  const temperatureCheck = useAtomValue(getTemperatureCheckByIdAtom(id))

  return Result.builder(temperatureCheck)
    .onInitial(() => {
      return <div>Loading...</div>
    })
    .onSuccess((tc) => <PageContent tc={tc} id={id} />)
    .onFailure((error) => {
      return <InlineCode>{Cause.pretty(error)}</InlineCode>
    })
    .render()
}

function PageContent({ tc, id }: { tc: TemperatureCheck; id: TemperatureCheckId }) {
  const status = getItemStatus(tc.deadline)
  const accountsVotesResult = useAtomValue(
    getTemperatureCheckVotesByAccountsAtom(tc.voters)
  )

  const header = (
    <DetailPageHeader
      status={status}
      typeBadge="TC"
      id={tc.id}
      title={tc.title}
      start={tc.start}
      deadline={tc.deadline}
      author={tc.author}
      links={tc.links.map((l) => l.toString())}
      quorumBadge={
        <QuorumBadge entityType="temperature_check" entityId={id} quorum={Number(tc.quorum)} />
      }
      originBadge={
        <PromoteToProposal
          temperatureCheckId={id}
          elevatedProposalId={tc.elevatedProposalId}
        />
      }
    />
  )

  const details = (
    <DetailPageDetails
      shortDescription={tc.shortDescription}
      description={tc.description}
      filename={`tc-${tc.id}-details.md`}
      proposalVoteOptions={tc.voteOptions}
    />
  )

  const resultsContent = (
    <>
      <VoteResultsSection
        entityType="temperature_check"
        entityId={id}
        voteOptions={TC_VOTE_OPTIONS}
      />
      <AccountVotesSection
        entityType="temperature_check"
        entityId={id}
        voteOptions={TC_VOTE_OPTIONS}
      />
    </>
  )

  const votingContent = (
    <VotingSection
      temperatureCheckId={id}
      keyValueStoreAddress={tc.voters}
      accountsVotesResult={accountsVotesResult}
    />
  )

  const sidebar = (
    <SidebarContent
      temperatureCheck={tc}
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
