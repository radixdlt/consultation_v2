import type { Result } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { TemperatureCheckSchema } from 'shared/governance/schemas'
import { AccountVotesSection } from './AccountVotesSection'
import { VoteResultsSection } from './VoteResultsSection'
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
      <VoteResultsSection id={id} />

      <VotingSection
        temperatureCheckId={id}
        keyValueStoreAddress={temperatureCheck.voters}
        accountsVotesResult={accountsVotesResult}
      />

      <AccountVotesSection id={id} />
    </div>
  )
}
