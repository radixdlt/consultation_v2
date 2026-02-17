/**
 * LSU → XRD converter map builder.
 *
 * Fetches validator LSU redemption values via a single StateEntityDetails call
 * and returns a HashMap mapping each LSU resource address to a converter function.
 */

import { StateEntityDetails } from '@radix-effects/gateway'
import {
  FungibleResourceAddress,
  type StateVersion
} from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import type { Context } from 'effect'
import { Effect, HashMap } from 'effect'
import { AccountBalanceState } from 'shared/snapshot/accountBalanceState'

/** Build an LSU → XRD converter map from the current validator state.
 *  Makes a single StateEntityDetails call for all LSU resources. */
export const buildLsuConverterMap = (
  stateEntityDetails: Context.Tag.Service<typeof StateEntityDetails>,
  stateVersion: StateVersion
) =>
  Effect.gen(function* () {
    const validatorsState = yield* AccountBalanceState.validatorsState

    if (validatorsState.length === 0)
      return HashMap.empty<
        FungibleResourceAddress,
        (amount: string) => string
      >()

    const lsuAddresses = validatorsState.map((v) => v.lsuResourceAddress)

    return yield* stateEntityDetails({
      addresses: lsuAddresses,
      opt_ins: { native_resource_details: true },
      at_ledger_state: { state_version: stateVersion }
    }).pipe(
      Effect.map((result) => {
        const entries = result.items
          .map((item) => {
            if (item.details?.type !== 'FungibleResource') return undefined
            if (
              item.details.native_resource_details?.kind !==
              'ValidatorLiquidStakeUnit'
            )
              return undefined

            const [value] =
              item.details.native_resource_details.unit_redemption_value
            const redemptionValue = new BigNumber(value?.amount ?? '0')

            const converter = (amount: string) =>
              redemptionValue.multipliedBy(amount).toFixed()

            return [
              FungibleResourceAddress.make(item.address),
              converter
            ] as const
          })
          .filter(
            (
              entry
            ): entry is readonly [
              FungibleResourceAddress,
              (amount: string) => string
            ] => entry !== undefined
          )

        return HashMap.fromIterable(entries)
      }),
      Effect.catchAll(() =>
        Effect.succeed(
          HashMap.empty<
            FungibleResourceAddress,
            (amount: string) => string
          >()
        )
      )
    )
  })

/** Get LSU resource addresses from the current validator state. */
export const getLsuResourceAddresses = (
  validatorsState: ReadonlyArray<{ readonly lsuResourceAddress: string }>
) =>
  validatorsState.map((v) =>
    FungibleResourceAddress.make(v.lsuResourceAddress)
  )
