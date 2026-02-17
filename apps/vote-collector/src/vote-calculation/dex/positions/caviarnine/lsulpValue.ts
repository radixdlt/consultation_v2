/**
 * Fetch the LSULP → XRD conversion rate from the CaviarNine LSULP component.
 *
 * Adapted from radix-incentives GetLsulpValueService.
 * Uses `StateEntityDetails` from @radix-effects/gateway instead of
 * the incentives-specific GetFungibleBalanceService.
 */

import { StateEntityDetails } from '@radix-effects/gateway'
import type {
  ProgrammaticScryptoSborValue,
  ProgrammaticScryptoSborValueDecimal
} from '@radixdlt/babylon-gateway-api-sdk'
import BigNumber from 'bignumber.js'
import { Array as A, Data, Effect, Option, pipe } from 'effect'
import { LSULP_COMPONENT_ADDRESS, LSULP_RESOURCE_ADDRESS } from '../../constants/assets'

class LsulpValueError extends Data.TaggedError('LsulpValueError')<{
  message: string
}> {}

export class LsulpValue extends Effect.Service<LsulpValue>()('LsulpValue', {
  dependencies: [StateEntityDetails.Default],
  effect: Effect.gen(function* () {
    const stateEntityDetails = yield* StateEntityDetails

    return Effect.fn('LsulpValue')(function* (input: {
      stateVersion: number
    }) {
      const result = yield* stateEntityDetails({
        addresses: [LSULP_COMPONENT_ADDRESS, LSULP_RESOURCE_ADDRESS],
        at_ledger_state: { state_version: input.stateVersion }
      })

      const componentItem = pipe(
        result.items,
        A.findFirst((item) => item.address === LSULP_COMPONENT_ADDRESS)
      )
      const resourceItem = pipe(
        result.items,
        A.findFirst((item) => item.address === LSULP_RESOURCE_ADDRESS)
      )

      if (Option.isNone(componentItem) || Option.isNone(resourceItem)) {
        return yield* new LsulpValueError({
          message: 'LSULP component or resource not found at state version'
        })
      }

      const resource = resourceItem.value
      const component = componentItem.value

      if (resource.details?.type !== 'FungibleResource') {
        return yield* new LsulpValueError({
          message: `Expected LSULP to be a FungibleResource, got ${resource.details?.type}`
        })
      }

      if (component.details?.type !== 'Component') {
        return yield* new LsulpValueError({
          message: `Expected LSULP component to be a Component, got ${component.details?.type}`
        })
      }

      const componentState =
        component.details.state as ProgrammaticScryptoSborValue

      if (componentState.kind !== 'Tuple') {
        return yield* new LsulpValueError({
          message: `Expected Tuple component state, got ${componentState.kind}`
        })
      }

      const dexValuationXrdField = pipe(
        componentState.fields,
        A.findFirst(
          (field): field is ProgrammaticScryptoSborValueDecimal =>
            field.field_name === 'dex_valuation_xrd' && field.kind === 'Decimal'
        )
      )

      if (Option.isNone(dexValuationXrdField)) {
        return yield* new LsulpValueError({
          message:
            'LSULP component state missing dex_valuation_xrd Decimal field'
        })
      }

      const dexValuationXrd = new BigNumber(dexValuationXrdField.value.value)
      const lsulpTotalSupply = pipe(
        Option.fromNullable(resource.details.total_supply),
        Option.map((v) => new BigNumber(v)),
        Option.getOrElse(() => new BigNumber('0'))
      )

      const lsulpToXrdRate = dexValuationXrd.dividedBy(lsulpTotalSupply)

      return {
        lsulpToXrdRate: lsulpToXrdRate.isNaN()
          ? new BigNumber(0)
          : lsulpToXrdRate
      }
    })
  })
}) {}
