import {
  type AccountAddress,
  Amount,
  type StateVersion
} from '@radix-effects/shared'
import { Array as A, Effect, Option, Record as R, pipe } from 'effect'
import { GovernanceConfig } from '../governance/config'
import { AccountBalanceState } from './accountBalanceState'

export class XrdPosition extends Effect.Service<XrdPosition>()('XrdPosition', {
  effect: Effect.gen(function* () {
    const { xrdResourceAddress } = yield* GovernanceConfig

    return {
      fromState: (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
      }) =>
        Effect.gen(function* () {
          const getFungibleTokenBalance =
            yield* AccountBalanceState.createGetFungibleTokenBalanceFn

          const getXrdBalance = (address: AccountAddress) =>
            pipe(
              getFungibleTokenBalance(address, xrdResourceAddress),
              Option.getOrElse(() => Amount.make('0'))
            )

          return pipe(
            input.addresses,
            A.map(
              (address) => [address, { xrd: getXrdBalance(address) }] as const
            ),
            R.fromEntries
          )
        })
    }
  })
}) {}
