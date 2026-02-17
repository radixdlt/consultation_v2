import { Atom } from '@effect-atom/atom-react'
import { AccountAddress } from '@radix-effects/shared'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { ConfigProvider, Data, Effect, Layer, Option } from 'effect'
import { truncateAddress } from '@/lib/utils'
import { GatewayApiClientLayer } from 'shared/gateway'
import type { ProposalId } from 'shared/governance/brandedTypes'
import {
  GovernanceComponent,
  type MakeProposalVoteInput,
  GovernanceConfigLayer
} from 'shared/governance/index'
import type { KeyValueStoreAddress } from 'shared/schemas'
import { makeAtomRuntime } from '@/atom/makeRuntimeAtom'
import {
  RadixDappToolkit,
  SendTransaction,
  WalletErrorResponse
} from '@/lib/dappToolkit'
import { accountsAtom } from './dappToolkitAtom'
import { withToast } from './withToast'
import { envVars } from '@/lib/envVars'

const runtime = makeAtomRuntime(
  Layer.mergeAll(GovernanceComponent.Default, SendTransaction.Default).pipe(
    Layer.provideMerge(RadixDappToolkit.Live),
    Layer.provideMerge(GatewayApiClientLayer),
    Layer.provide(GovernanceConfigLayer),
    Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(envVars)))
  )
)

const PAGE_SIZE = 5

export type SortOrder = 'asc' | 'desc'

export const paginatedProposalsAtom = Atom.family((page: number) =>
  Atom.family((sortOrder: SortOrder) =>
    runtime.atom(
      Effect.gen(function* () {
        const governanceComponent = yield* GovernanceComponent
        return yield* governanceComponent.getPaginatedProposals({
          page,
          pageSize: PAGE_SIZE,
          sortOrder
        })
      })
    )
  )
)

export const getProposalByIdAtom = Atom.family((id: ProposalId) =>
  runtime.atom(
    Effect.gen(function* () {
      const governanceComponent = yield* GovernanceComponent
      return yield* governanceComponent.getProposalById(id)
    })
  )
)

export const getProposalVotesByAccountsAtom = Atom.family(
  (keyValueStoreAddress: KeyValueStoreAddress) =>
    runtime.atom(
      Effect.fnUntraced(function* (get) {
        const accounts = yield* get.result(accountsAtom)

        const governanceComponent = yield* GovernanceComponent

        const votes = yield* governanceComponent.getProposalVotesByAccounts({
          keyValueStoreAddress,
          accounts: accounts.map((account) =>
            AccountAddress.make(account.address)
          )
        })

        return votes.map((vote) => {
          const account = accounts.find((a) => a.address === vote.address)
          return {
            ...vote,
            label: account?.label ?? 'Unknown Account'
          }
        })
      })
    )
)

export class AccountAlreadyVotedError extends Data.TaggedError(
  'AccountAlreadyVotedError'
)<{
  message: string
}> {}

const componentErrorMessage = {
  accountAlreadyVoted: 'accountAlreadyVoted'
} as const

const voteOnProposal = (input: MakeProposalVoteInput, message?: string) =>
  Effect.gen(function* () {
    const governanceComponent = yield* GovernanceComponent
    const sendTransaction = yield* SendTransaction

    const manifest = yield* governanceComponent.makeProposalVoteManifest(input)

    return yield* sendTransaction(manifest, message ?? 'Proposal vote').pipe(
      Effect.catchTag('WalletErrorResponse', (error) =>
        Effect.gen(function* () {
          if (
            error.message?.includes(componentErrorMessage.accountAlreadyVoted)
          ) {
            return yield* new AccountAlreadyVotedError({
              message: 'Account has already voted on this proposal'
            })
          }
          return yield* new WalletErrorResponse({
            error: error.message ?? 'Unknown wallet error'
          })
        })
      )
    )
  })

type VoteResult = { account: string; success: boolean; error?: string }

export const voteOnProposalBatchAtom = runtime.fn(
  Effect.fn(
    function* (
      input: {
        accounts: WalletDataStateAccount[]
        proposalId: ProposalId
        keyValueStoreAddress: KeyValueStoreAddress
        optionIds: number[]
        selectedOptionLabels: string[]
      },
      get
    ) {
      // No pre-filtering: accounts that already voted can change their vote
      const accountsToVote = input.accounts

      const results: VoteResult[] = []

      for (const account of accountsToVote) {
        const message = `Vote ${input.selectedOptionLabels.join(', ')} on GP #${input.proposalId} with ${truncateAddress(account.address)}`
        const result = yield* voteOnProposal(
          {
            accountAddress: AccountAddress.make(account.address),
            proposalId: input.proposalId,
            optionIds: input.optionIds
          },
          message
        ).pipe(
          Effect.map(
            (): VoteResult => ({ account: account.address, success: true })
          ),
          Effect.catchAll((error) =>
            Effect.succeed<VoteResult>({
              account: account.address,
              success: false,
              error:
                'message' in error ? (error.message as string) : 'Vote failed'
            })
          )
        )
        results.push(result)
      }

      const hasSuccessfulVotes = results.some((r) => r.success)
      if (hasSuccessfulVotes) {
        get.refresh(getProposalVotesByAccountsAtom(input.keyValueStoreAddress))
      }

      return results
    },
    withToast({
      whenLoading: 'Submitting votes...',
      whenSuccess: ({ result }) => {
        const successes = result.filter((r) => r.success).length
        const failures = result.filter((r) => !r.success).length
        if (failures === 0) return `${successes} vote(s) submitted`
        if (successes === 0) return 'All votes failed'
        return `${successes} submitted, ${failures} failed`
      },
      whenFailure: () => Option.some('Failed to submit votes')
    })
  )
)
