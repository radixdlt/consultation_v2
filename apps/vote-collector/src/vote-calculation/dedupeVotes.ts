import type { AccountAddress } from '@radix-effects/shared'
import { Array as A, Effect, flow } from 'effect'
import type { GovernanceComponent } from 'shared/governance/index'
import type { KeyValueStoreAddress } from 'shared/schemas'

export type DedupedVote = { accountAddress: AccountAddress; votes: string[] }

type FetchParams = {
  keyValueStoreAddress: KeyValueStoreAddress
  fromIndexInclusive: number
  toIndexInclusive: number
}

const dedupeByAccount = <T extends { accountAddress: AccountAddress }>(
  items: ReadonlyArray<T>
) =>
  A.dedupeWith(A.reverse(items), (a, b) => a.accountAddress === b.accountAddress)

export const fetchDedupedTemperatureCheckVotes = (
  governance: GovernanceComponent,
  params: FetchParams
) =>
  governance.getTemperatureCheckVotesByIndex(params).pipe(
    Effect.map(
      flow(
        dedupeByAccount,
        A.map(
          (v): DedupedVote => ({
            accountAddress: v.accountAddress,
            votes: [v.vote]
          })
        )
      )
    )
  )

export const fetchDedupedProposalVotes = (
  governance: GovernanceComponent,
  params: FetchParams
) =>
  governance.getProposalVotesByIndex(params).pipe(
    Effect.map(
      flow(
        dedupeByAccount,
        A.map(
          (v): DedupedVote => ({
            accountAddress: v.accountAddress,
            votes: v.options.map(String)
          })
        )
      )
    )
  )
