import { StateEntityDetails } from '@radix-effects/gateway'
import {
  type AccountAddress,
  Amount,
  FungibleResourceAddress,
  type StateVersion
} from '@radix-effects/shared'
import type { ProgrammaticScryptoSborValue } from '@radixdlt/babylon-gateway-api-sdk'
import BigNumber from 'bignumber.js'
import { Data, Effect, HashMap, Option, Record as R } from 'effect'
import { reduce } from 'effect/Array'
import s from 'sbor-ez-mode'
import { AccountBalanceState } from './accountBalanceState'

class InvalidResourceError extends Data.TaggedError('InvalidResourceError')<{
  message: string
}> {}

class InvalidNativeResourceKindError extends Data.TaggedError(
  'InvalidNativeResourceKindError'
)<{
  message: string
}> {}

class InvalidClaimNftError extends Data.TaggedError('InvalidClaimNftError')<{
  message: string
}> {}

export const claimNftSchema = s.struct({
  claim_amount: s.decimal()
})

export const parseClaimNft = (sbor: ProgrammaticScryptoSborValue) =>
  Effect.gen(function* () {
    const result = claimNftSchema.safeParse(sbor)
    if (result.isErr()) {
      return yield* new InvalidClaimNftError({
        message: result.error.message
      })
    }
    return result.value.claim_amount
  })

export class LsuPosition extends Effect.Service<LsuPosition>()('LsuPosition', {
  dependencies: [StateEntityDetails.Default],
  effect: Effect.gen(function* () {
    const getEntityDetails = yield* StateEntityDetails

    const createLsuToXrdConverter = (input: {
      addresses: FungibleResourceAddress[]
      stateVersion: StateVersion
    }) =>
      getEntityDetails({
        addresses: input.addresses,
        opt_ins: {
          native_resource_details: true
        },
        at_ledger_state: { state_version: input.stateVersion }
      }).pipe(
        Effect.flatMap((result) =>
          Effect.forEach(result.items, (entityDetails) =>
            Effect.gen(function* () {
              if (entityDetails.details?.type !== 'FungibleResource') {
                return yield* new InvalidResourceError({
                  message: `Expected a fungible resource, got ${entityDetails.details?.type}`
                })
              }
              if (
                entityDetails.details.native_resource_details?.kind !==
                'ValidatorLiquidStakeUnit'
              ) {
                return yield* new InvalidNativeResourceKindError({
                  message: `Expected a validator liquid stake unit, got ${entityDetails.details.native_resource_details?.kind}`
                })
              }
              const [value] =
                entityDetails.details.native_resource_details
                  .unit_redemption_value

              const unit_redemption_value = value?.amount ?? '0'
              const unitRedemptionValue = new BigNumber(unit_redemption_value)
              const converter = (amount: Amount) =>
                unitRedemptionValue
                  .multipliedBy(amount)
                  .decimalPlaces(2)
                  .toString()
              return [
                FungibleResourceAddress.make(entityDetails.address),
                converter
              ] satisfies [FungibleResourceAddress, typeof converter]
            })
          )
        ),
        Effect.map(HashMap.fromIterable)
      )

    return {
      fromState: (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
      }) =>
        Effect.gen(function* () {
          const validatorsState = yield* AccountBalanceState.validatorsState

          const lsuResourceAddresses = validatorsState.map((validator) =>
            FungibleResourceAddress.make(validator.lsuResourceAddress)
          )

          const lsuToXrdConverterMap = yield* createLsuToXrdConverter({
            addresses: lsuResourceAddresses,
            stateVersion: input.stateVersion
          })

          const getFungibleTokenBalance =
            yield* AccountBalanceState.createGetFungibleTokenBalanceFn

          const getLsuFromAccount = (address: AccountAddress) =>
            Effect.forEach(lsuResourceAddresses, (resourceAddress) =>
              getFungibleTokenBalance(address, resourceAddress).pipe(
                Option.match({
                  onNone: () => Effect.succeed(Amount.make('0')),
                  onSome: (amount) =>
                    lsuToXrdConverterMap.pipe(
                      HashMap.get(resourceAddress),
                      Effect.map((converter) => converter(amount))
                    )
                })
              )
            ).pipe(
              Effect.map(
                reduce(new BigNumber(0), (acc, item) => acc.plus(item))
              ),
              Effect.map((xrdValue) => Amount.make(xrdValue.toString()))
            )

          return yield* Effect.reduce(
            input.addresses,
            R.empty<AccountAddress, Record<string, Amount>>(),
            (acc, accountAddress) =>
              Effect.gen(function* () {
                const amount = yield* getLsuFromAccount(accountAddress)

                return R.set(acc, accountAddress, {
                  lsu: amount
                })
              })
          )
        })
    }
  })
}) {}
