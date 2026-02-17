/**
 * Auto-detect whether a token is XRD, an LSU, or LSULP and convert its
 * amount to an XRD-equivalent value. Tokens that don't match are discarded.
 */

import type { FungibleResourceAddress } from '@radix-effects/shared'
import type BigNumber from 'bignumber.js'
import { HashMap } from 'effect'
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
    address as FungibleResourceAddress
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

  if (isLsu(address, ctx.lsuConverterMap)) {
    const converter = HashMap.unsafeGet(
      ctx.lsuConverterMap,
      address as FungibleResourceAddress
    )
    return converter(amount)
  }

  return '0'
}
