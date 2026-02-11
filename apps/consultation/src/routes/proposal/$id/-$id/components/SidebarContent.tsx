import type { Result } from '@effect-atom/atom-react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import { AccountVotesSection } from '@/components/detail/AccountVotesSection'
import { VoteResultsSection } from '@/components/detail/VoteResultsSection'
import { VotingSection } from './VotingSection'
import type { ProposalVotedAccount } from '../types'

type SidebarContentProps = {
  proposal: Proposal
  id: ProposalId
  accountsVotesResult: Result.Result<ProposalVotedAccount[], unknown>
}

export function SidebarContent({ proposal, id, accountsVotesResult }: SidebarContentProps) {
  return (
    <div className="space-y-6">
      <VoteResultsSection
        entityType="proposal"
        entityId={id}
        voteOptions={proposal.voteOptions}
      />

      <VotingSection
        proposalId={id}
        proposal={proposal}
        keyValueStoreAddress={proposal.voters}
        accountsVotesResult={accountsVotesResult}
      />

      <AccountVotesSection
        entityType="proposal"
        entityId={id}
        voteOptions={proposal.voteOptions}
      />
    </div>
  )
}
