import { GetFungibleBalance, GetValidators } from '@radix-effects/gateway'
import {
  AccountAddress,
  Amount,
  FungibleResourceAddress,
  NonFungibleResourceAddress,
  StateVersion,
  ValidatorAddress
} from '@radix-effects/shared'
import { Context, Effect, HashMap, Option, Ref, Schema } from 'effect'
import { map, reduce } from 'effect/Array'

const FungibleTokenBalanceStateSchema = Schema.HashMap({
  key: AccountAddress,
  value: Schema.HashMap({
    key: FungibleResourceAddress,
    value: Amount
  })
})

const ValidatorsStateSchema = Schema.Array(
  Schema.Struct({
    address: ValidatorAddress,
    lsuResourceAddress: FungibleResourceAddress,
    claimNftResourceAddress: NonFungibleResourceAddress
  })
)

export class FungibleTokenBalanceState extends Context.Tag(
  'FungibleTokenBalanceState'
)<
  FungibleTokenBalanceState,
  Ref.Ref<typeof FungibleTokenBalanceStateSchema.Type>
>() {}

export class ValidatorsState extends Context.Tag('ValidatorsState')<
  ValidatorsState,
  Ref.Ref<typeof ValidatorsStateSchema.Type>
>() {}

export type MakeStateInput = {
  addresses: AccountAddress[]
  stateVersion: StateVersion
}

/**
 * Service for capturing point-in-time snapshots of account token balances.
 * Used for snapshot-based voting to determine voting power at a specific ledger state version.
 *
 * Provides:
 * - makeFungibleTokenBalanceState: Fetches fungible token balances for accounts at a state version
 * - makeValidatorsState: Fetches all validators with their LSU and claim NFT resource addresses
 * - createGetFungibleTokenBalanceFn: Returns a lookup function for querying balances
 */
export class AccountBalanceState extends Effect.Service<AccountBalanceState>()(
  'AccountBalanceState',
  {
    dependencies: [GetValidators.Default, GetFungibleBalance.Default],
    effect: Effect.gen(function* () {
      const getAllValidatorsService = yield* GetValidators
      const getFungibleBalanceService = yield* GetFungibleBalance

      const getFungibleTokens = (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
      }) =>
        getFungibleBalanceService({
          addresses: input.addresses,
          at_ledger_state: {
            state_version: input.stateVersion
          }
        }).pipe(
          Effect.map(
            reduce(
              HashMap.empty<
                AccountAddress,
                HashMap.HashMap<FungibleResourceAddress, Amount>
              >(),
              (acc, { address, items }) => {
                const resources = reduce(
                  items,
                  HashMap.empty<FungibleResourceAddress, Amount>(),
                  (acc, item) =>
                    HashMap.set(
                      acc,
                      FungibleResourceAddress.make(item.resource_address),
                      Amount.make(item.amount.toString())
                    )
                )

                return HashMap.set(acc, AccountAddress.make(address), resources)
              }
            )
          )
        )

      return {
        makeFungibleTokenBalanceState: (input: MakeStateInput) =>
          getFungibleTokens({
            addresses: input.addresses.map((address) =>
              AccountAddress.make(address)
            ),
            stateVersion: StateVersion.make(input.stateVersion)
          }).pipe(
            Effect.flatMap(
              Ref.make<typeof FungibleTokenBalanceStateSchema.Type>
            ),
            Effect.orDie
          ),
        makeValidatorsState: getAllValidatorsService().pipe(
          Effect.map(
            map((validator) => ({
              address: ValidatorAddress.make(validator.address),
              lsuResourceAddress: FungibleResourceAddress.make(
                validator.lsuResourceAddress
              ),
              claimNftResourceAddress: NonFungibleResourceAddress.make(
                validator.claimNftResourceAddress
              )
            }))
          ),

          Effect.flatMap(Ref.make<typeof ValidatorsStateSchema.Type>)
        )
      }
    })
  }
) {
  static fungibleTokenState = FungibleTokenBalanceState.pipe(
    Effect.flatMap(Ref.get)
  )
  static createGetFungibleTokenBalanceFn = Effect.gen(function* () {
    const fungibleTokenState = yield* AccountBalanceState.fungibleTokenState
    return (
      address: AccountAddress,
      resourceAddress: FungibleResourceAddress
    ) =>
      HashMap.get(fungibleTokenState, address).pipe(
        Option.map((balance) => HashMap.get(balance, resourceAddress)),
        Option.flatten
      )
  })

  static validatorsState = ValidatorsState.pipe(Effect.flatMap(Ref.get))
}
