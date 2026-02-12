import type { Result } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { TemperatureCheckSchema } from 'shared/governance/schemas'
import { AccountVotesSection } from '@/components/detail/AccountVotesSection'
import { VoteResultsSection } from '@/components/detail/VoteResultsSection'
import { TC_VOTE_OPTIONS } from '@/lib/voteColors'
import { VotingSection } from './VotingSection'
import type { VotedAccount } from '../types'

type TemperatureCheck = typeof TemperatureCheckSchema.Type

type SidebarContentProps = {
  temperatureCheck: TemperatureCheck
  id: TemperatureCheckId
  accountsVotesResult: Result.Result<VotedAccount[], unknown>
}

export function SidebarContent({ temperatureCheck, id, accountsVotesResult }: SidebarContentProps) {
  return (
    <div className="space-y-6">
      <VoteResultsSection
        entityType="temperature_check"
        entityId={id}
        voteOptions={TC_VOTE_OPTIONS}
      />

      <VotingSection
        temperatureCheckId={id}
        keyValueStoreAddress={temperatureCheck.voters}
        accountsVotesResult={accountsVotesResult}
      />

      <AccountVotesSection
        entityType="temperature_check"
        entityId={id}
        voteOptions={TC_VOTE_OPTIONS}
      />
    </div>
  )
}
