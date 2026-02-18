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
import { Array as A, Effect, HashMap, Option, pipe } from 'effect'
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
      Effect.map((result) =>
        pipe(
          result.items,
          A.filterMap((item) => {
            if (item.details?.type !== 'FungibleResource') return Option.none()
            if (
              item.details.native_resource_details?.kind !==
              'ValidatorLiquidStakeUnit'
            )
              return Option.none()

            const redemptionValue = pipe(
              item.details.native_resource_details.unit_redemption_value,
              A.head,
              Option.flatMap((v) => Option.fromNullable(v.amount)),
              Option.map((amount) => new BigNumber(amount)),
              Option.getOrElse(() => new BigNumber('0'))
            )

            const converter = (amount: string) =>
              redemptionValue.multipliedBy(amount).toFixed()

            return Option.some([
              FungibleResourceAddress.make(item.address),
              converter
            ] as const)
          }),
          HashMap.fromIterable
        )
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logWarning('Failed to build LSU converter map', {
            error
          })
          return HashMap.empty<
            FungibleResourceAddress,
            (amount: string) => string
          >()
        })
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
