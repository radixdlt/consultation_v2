import { Atom } from '@effect-atom/atom-react'
import { GetFungibleBalance } from '@radix-effects/gateway'
import { AccountAddress } from '@radix-effects/shared'
import { Effect, Layer, Option } from 'effect'
import { StokenetGatewayApiClientLayer } from 'shared/gateway'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { Config, GovernanceComponent } from 'shared/governance/index'
import { makeAtomRuntime } from '@/atom/makeRuntimeAtom'
import {
  RadixDappToolkit,
  SendTransaction,
  WalletErrorResponse
} from '@/lib/dappToolkit'
import { getCurrentAccount } from '@/lib/selectedAccount'
import {
  getTemperatureCheckByIdAtom,
  NoAccountConnectedError
} from './temperatureChecksAtom'
import { withToast } from './withToast'

const runtime = makeAtomRuntime(
  Layer.mergeAll(
    GovernanceComponent.Default,
    GetFungibleBalance.Default,
    SendTransaction.Default
  ).pipe(
    Layer.provideMerge(RadixDappToolkit.Live),
    Layer.provideMerge(StokenetGatewayApiClientLayer),
    Layer.provideMerge(Config.StokenetLive)
  )
)

/** Checks whether a specific account holds the admin badge */
export const isAdminAtom = Atom.family((accountAddress: string) =>
  runtime.atom(
    Effect.gen(function* () {
      const config = yield* Config
      const getFungibleBalance = yield* GetFungibleBalance

      const balances = yield* getFungibleBalance({
        addresses: [accountAddress]
      })

      return balances.some((account) =>
        account.items.some(
          (item) => item.resource_address === config.adminBadgeAddress
        )
      )
    })
  )
)

/** Promotes a temperature check to a proposal */
export const promoteToProposalAtom = runtime.fn(
  Effect.fn(
    function* (temperatureCheckId: TemperatureCheckId, get) {
      const governanceComponent = yield* GovernanceComponent
      const sendTransaction = yield* SendTransaction

      const currentAccountOption = yield* getCurrentAccount

      if (Option.isNone(currentAccountOption)) {
        return yield* new NoAccountConnectedError({
          message: 'Please connect your wallet first'
        })
      }

      const currentAccount = currentAccountOption.value
      const accountAddress = AccountAddress.make(currentAccount.address)

      const manifest = yield* governanceComponent.makeProposalManifest({
        accountAddress,
        temperatureCheckId
      })

      yield* Effect.log('Promote to proposal manifest:', manifest)

      const result = yield* sendTransaction(manifest, 'Promote to proposal')

      get.refresh(getTemperatureCheckByIdAtom(temperatureCheckId))

      return result
    },
    withToast({
      whenLoading: 'Promoting to proposal...',
      whenSuccess: 'Temperature check promoted to proposal',
      whenFailure: ({ cause }) => {
        if (cause._tag === 'Fail') {
          if (cause.error instanceof WalletErrorResponse) {
            return Option.some(cause.error.message ?? 'Wallet error')
          }
          if (cause.error instanceof NoAccountConnectedError) {
            return Option.some(cause.error.message)
          }
        }
        return Option.some('Failed to promote to proposal')
      }
    })
  )
)
