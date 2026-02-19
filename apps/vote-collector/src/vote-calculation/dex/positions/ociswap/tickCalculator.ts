/**
 * Ociswap tick/price calculation utilities.
 *
 * Copied from radix-incentives/packages/api/src/common/dapps/ociswap/tickCalculator.ts
 */

import DecimalJs from 'decimal.js'

/** Isolated Decimal constructor to avoid global config conflicts with other modules. */
export const Decimal = DecimalJs.clone({ precision: 50 })
export type Decimal = DecimalJs

export const TICK_BASE_SQRT = new Decimal(
  '1.000049998750062496094023416993798697'
)

export const tickToPriceSqrt = (tick: number): Decimal =>
  TICK_BASE_SQRT.pow(tick)

export const floorToDecimals = (
  value: Decimal,
  divisibility: number
): Decimal => {
  const decimalPlaces = Math.max(0, divisibility)
  return value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN)
}

export const removableAmounts = (
  liquidity: Decimal,
  priceSqrt: Decimal,
  priceLeftBoundSqrt: Decimal,
  priceRightBoundSqrt: Decimal,
  xDivisibility: number,
  yDivisibility: number
): [Decimal, Decimal] => {
  if (priceSqrt.lte(priceLeftBoundSqrt)) {
    const xAmount = Decimal.max(
      liquidity
        .div(priceLeftBoundSqrt)
        .sub(liquidity.div(priceRightBoundSqrt)),
      new Decimal(0)
    )
    return [floorToDecimals(xAmount, xDivisibility), new Decimal(0)]
  }

  if (priceSqrt.gte(priceRightBoundSqrt)) {
    const yAmount = liquidity.mul(
      priceRightBoundSqrt.sub(priceLeftBoundSqrt)
    )
    return [new Decimal(0), floorToDecimals(yAmount, yDivisibility)]
  }

  const xAmount = Decimal.max(
    liquidity.div(priceSqrt).sub(liquidity.div(priceRightBoundSqrt)),
    new Decimal(0)
  )
  const yAmount = liquidity.mul(priceSqrt.sub(priceLeftBoundSqrt))

  return [
    floorToDecimals(xAmount, xDivisibility),
    floorToDecimals(yAmount, yDivisibility)
  ]
}
