import { useAtomValue } from '@effect-atom/atom-react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import type { Proposal } from 'shared/governance/schemas'
import { getProposalVotesByAccountsAtom } from '@/atom/proposalsAtom'
import { AccountVotesSection } from './AccountVotesSection'
import { SourceTemperatureCheck } from './SourceTemperatureCheck'
import { VoteResultsSection } from './VoteResultsSection'
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
        <h1 className="font-light text-3xl tracking-tight">
          {proposal.title}
        </h1>
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

      <VoteResultsSection id={id} voteOptions={proposal.voteOptions} />

      <AccountVotesSection id={id} voteOptions={proposal.voteOptions} />

      <SourceTemperatureCheck
        temperatureCheckId={proposal.temperatureCheckId}
      />

      <div className="space-y-3 text-sm border-t border-border pt-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Author
          </span>
          <p className="text-foreground truncate mt-0.5">{proposal.author}</p>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vote Options
          </span>
          <p className="text-foreground mt-0.5">
            {proposal.voteOptions.map((option) => option.label).join(', ')}
          </p>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Links
          </span>
          <div className="space-y-1 mt-0.5">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ID
          </span>
          <p className="text-foreground mt-0.5">{proposal.id}</p>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Votes Store
          </span>
          <p className="text-foreground truncate mt-0.5">
            {proposal.votes.toString()}
          </p>
        </div>
      </div>
    </div>
  )
}
