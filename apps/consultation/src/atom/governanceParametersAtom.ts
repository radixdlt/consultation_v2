import { ConfigProvider, Effect, Layer, Option, ParseResult } from 'effect'
import { AccountAddress } from '@radix-effects/shared'
import { GatewayApiClientLayer } from 'shared/gateway'
import {
  GovernanceConfigLayer,
  GovernanceComponent
} from 'shared/governance/index'
import { makeAtomRuntime } from '@/atom/makeRuntimeAtom'
import {
  RadixDappToolkit,
  SendTransaction,
  WalletErrorResponse
} from '@/lib/dappToolkit'
import { getCurrentAccount } from '@/lib/selectedAccount'
import { NoAccountConnectedError } from './temperatureChecksAtom'
import { withToast } from './withToast'
import { envVars } from '@/lib/envVars'

const runtime = makeAtomRuntime(
  Layer.mergeAll(GovernanceComponent.Default, SendTransaction.Default).pipe(
    Layer.provideMerge(RadixDappToolkit.Live),

    Layer.provideMerge(GatewayApiClientLayer),
    Layer.provideMerge(GovernanceConfigLayer),
    Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(envVars)))
  )
)

export const governanceParametersAtom = runtime.atom(
  Effect.gen(function* () {
    const governanceComponent = yield* GovernanceComponent
    return yield* governanceComponent.getGovernanceParameters()
  })
)

export const updateGovernanceParametersAtom = runtime.fn(
  Effect.fn(
    function* (
      input: {
        temperatureCheckDays: number
        temperatureCheckQuorum: string
        temperatureCheckApprovalThreshold: string
        proposalLengthDays: number
        proposalQuorum: string
        proposalApprovalThreshold: string
      },
      get
    ) {
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

      const manifest =
        yield* governanceComponent.makeUpdateGovernanceParametersManifest({
          accountAddress,
          ...input
        })

      const result = yield* sendTransaction(
        manifest,
        'Updating governance parameters'
      )

      get.refresh(governanceParametersAtom)

      return result
    },
    withToast({
      whenLoading: 'Updating governance parameters...',
      whenSuccess: 'Governance parameters updated',
      whenFailure: ({ cause }) => {
        if (cause._tag === 'Fail') {
          if (cause.error instanceof WalletErrorResponse) {
            return Option.some(cause.error.message ?? 'Wallet error')
          }
          if (cause.error instanceof NoAccountConnectedError) {
            return Option.some(cause.error.message)
          }
          if (cause.error instanceof ParseResult.ParseError) {
            return Option.some('Invalid parameters: ' + cause.error.message)
          }
        }
        return Option.some('Failed to update governance parameters')
      }
    })
  )
)
