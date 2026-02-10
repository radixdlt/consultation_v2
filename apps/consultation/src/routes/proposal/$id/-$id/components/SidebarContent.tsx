import { useAtomValue } from '@effect-atom/atom-react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import { getProposalVotesByAccountsAtom } from '@/atom/proposalsAtom'
import { SourceTemperatureCheck } from './SourceTemperatureCheck'
import { VotingSection } from './VotingSection'
import { YourVotesSection } from './YourVotesSection'

type SidebarContentProps = {
  proposal: Proposal
  id: ProposalId
}

export function SidebarContent({ proposal, id }: SidebarContentProps) {
  const accountsVotesResult = useAtomValue(
    getProposalVotesByAccountsAtom(proposal.voters)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{proposal.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {proposal.shortDescription}
        </p>
      </div>

      <VotingSection
        proposalId={id}
        proposal={proposal}
        keyValueStoreAddress={proposal.voters}
        accountsVotesResult={accountsVotesResult}
      />

      <YourVotesSection
        accountsVotesResult={accountsVotesResult}
        voteOptions={proposal.voteOptions}
      />

      <SourceTemperatureCheck
        temperatureCheckId={proposal.temperatureCheckId}
      />

      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium">Author</span>
          <p className="text-muted-foreground truncate">{proposal.author}</p>
        </div>

        <div>
          <span className="font-medium">Vote Options</span>
          <p className="text-muted-foreground">
            {proposal.voteOptions.map((option) => option.label).join(', ')}
          </p>
        </div>

        <div>
          <span className="font-medium">Links</span>
          <div className="space-y-1">
            {proposal.links.map((link) => (
              <a
                key={link.toString()}
                href={link.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline truncate"
              >
                {link.toString()}
              </a>
            ))}
          </div>
        </div>

        <div>
          <span className="font-medium">ID</span>
          <p className="text-muted-foreground">{proposal.id}</p>
        </div>

        <div>
          <span className="font-medium">Votes Store</span>
          <p className="text-muted-foreground truncate">
            {proposal.votes.toString()}
          </p>
        </div>
      </div>
    </div>
  )
}
