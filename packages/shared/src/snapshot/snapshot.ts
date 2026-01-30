import {
  GetFungibleBalance,
  GetLedgerStateService
} from '@radix-effects/gateway'
import {
  AccountAddress,
  type Amount,
  StateVersion
} from '@radix-effects/shared'
import { Array as A, Config, Effect, flow, Record as R, Schema } from 'effect'
import {
  AccountBalanceState,
  FungibleTokenBalanceState,
  ValidatorsState
} from './accountBalanceState'
import { LsuPosition } from './lsu'

const SnapshotInputSchema = Schema.Struct({
  addresses: Schema.mutable(Schema.Array(AccountAddress)),
  stateVersion: StateVersion
})

type SnapshotInput = typeof SnapshotInputSchema.Type

export class Snapshot extends Effect.Service<Snapshot>()('Snapshot', {
  dependencies: [
    GetFungibleBalance.Default,
    AccountBalanceState.Default,
    GetLedgerStateService.Default,
    LsuPosition.Default
  ],
  effect: Effect.gen(function* () {
    const accountBalanceState = yield* AccountBalanceState
    const getLedgerStateService = yield* GetLedgerStateService

    const stakedPosition = yield* LsuPosition

    const concurrency = yield* Config.number(
      'GET_ACCOUNT_BALANCES_CONCURRENCY'
    ).pipe(Config.withDefault(10))

    return Effect.fnUntraced(function* (input: SnapshotInput) {
      const ledgerState = yield* getLedgerStateService({
        at_ledger_state: {
          state_version: input.stateVersion
        }
      })

      const timestamp = new Date(ledgerState.proposer_round_timestamp)
      const addresses = input.addresses.map((address) =>
        AccountAddress.make(address)
      )
      const stateVersion = StateVersion.make(input.stateVersion)

      yield* Effect.log('snapshot', {
        timestamp: timestamp.toISOString(),
        addresses: input.addresses.length,
        stateVersion: input.stateVersion
      })

      return yield* Effect.all(
        [
          stakedPosition.fromState({
            addresses,
            stateVersion
          })
        ],
        {
          concurrency
        }
      ).pipe(
        Effect.map(
          flow(
            A.reduce(
              R.empty<AccountAddress, Record<string, Amount>>(),
              (acc, position) =>
                R.union(acc, position, (a, b) => ({ ...a, ...b }))
            )
          )
        ),
        Effect.provideService(
          FungibleTokenBalanceState,
          yield* accountBalanceState.makeFungibleTokenBalanceState(input)
        ),
        Effect.provideService(
          ValidatorsState,
          yield* accountBalanceState.makeValidatorsState
        )
      )
    })
  })
}) {}
