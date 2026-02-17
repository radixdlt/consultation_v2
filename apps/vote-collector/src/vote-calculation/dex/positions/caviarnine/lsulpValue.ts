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
import { Data, Effect } from 'effect'
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

      const componentItem = result.items.find(
        (item) => item.address === LSULP_COMPONENT_ADDRESS
      )
      const resourceItem = result.items.find(
        (item) => item.address === LSULP_RESOURCE_ADDRESS
      )

      if (!componentItem || !resourceItem) {
        return yield* new LsulpValueError({
          message: 'LSULP component or resource not found at state version'
        })
      }

      if (resourceItem.details?.type !== 'FungibleResource') {
        return yield* new LsulpValueError({
          message: `Expected LSULP to be a FungibleResource, got ${resourceItem.details?.type}`
        })
      }

      if (componentItem.details?.type !== 'Component') {
        return yield* new LsulpValueError({
          message: `Expected LSULP component to be a Component, got ${componentItem.details?.type}`
        })
      }

      const componentState =
        componentItem.details.state as ProgrammaticScryptoSborValue

      if (componentState.kind !== 'Tuple') {
        return yield* new LsulpValueError({
          message: `Expected Tuple component state, got ${componentState.kind}`
        })
      }

      const dexValuationXrdField = componentState.fields.find(
        (field): field is ProgrammaticScryptoSborValueDecimal =>
          field.field_name === 'dex_valuation_xrd' && field.kind === 'Decimal'
      )

      if (!dexValuationXrdField) {
        return yield* new LsulpValueError({
          message:
            'LSULP component state missing dex_valuation_xrd Decimal field'
        })
      }

      const dexValuationXrd = new BigNumber(dexValuationXrdField.value)
      const lsulpTotalSupply = new BigNumber(
        resourceItem.details.total_supply ?? '0'
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
