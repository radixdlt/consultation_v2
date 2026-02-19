/**
 * Auto-detect whether a token is XRD, an LSU, or LSULP and convert its
 * amount to an XRD-equivalent value. Tokens that don't match are discarded.
 */

import { FungibleResourceAddress } from '@radix-effects/shared'
import type BigNumber from 'bignumber.js'
import { HashMap, Option, pipe } from 'effect'
import { LSULP_RESOURCE_ADDRESS, XRD_ADDRESS } from './constants/assets'

export type LsuConverterMap = HashMap.HashMap<
  FungibleResourceAddress,
  (amount: string) => string
>

export type TokenFilterContext = {
  readonly lsuConverterMap: LsuConverterMap
  readonly lsulpToXrdRate: BigNumber
}

export const isXrd = (address: string): boolean => address === XRD_ADDRESS

export const isLsulp = (address: string): boolean =>
  address === LSULP_RESOURCE_ADDRESS

export const isLsu = (
  address: string,
  lsuConverterMap: LsuConverterMap
): boolean =>
  HashMap.has(
    lsuConverterMap,
    FungibleResourceAddress.make(address)
  )

/**
 * Convert a token amount to XRD. Returns '0' for unrecognised tokens.
 *
 * - XRD → amount as-is
 * - LSU → amount × unit_redemption_value
 * - LSULP → amount × lsulpToXrdRate
 * - Other → '0'
 */
export const convertToXrd = (
  address: string,
  amount: string,
  ctx: TokenFilterContext
): string => {
  if (isXrd(address)) {
    return amount
  }

  if (isLsulp(address)) {
    return ctx.lsulpToXrdRate.multipliedBy(amount).toFixed()
  }

  return pipe(
    HashMap.get(ctx.lsuConverterMap, FungibleResourceAddress.make(address)),
    Option.map((converter) => converter(amount)),
    Option.getOrElse(() => '0')
  )
}
