/**
 * CaviarNine tick/price calculation utilities.
 *
 * Copied from radix-incentives/packages/api/src/common/dapps/caviarnine/tickCalculator.ts
 */

import { Decimal } from 'decimal.js'

const MIN_PRICE = new Decimal('0.000000000001892254')
const TICK_SIZE = new Decimal('1.00100025')

export const calculateTick = (price: Decimal): number => {
  const priceDecimal = new Decimal(price)
  if (priceDecimal.lte(0)) return 0
  const priceRatio = priceDecimal.div(MIN_PRICE)
  const tick = priceRatio.ln().div(TICK_SIZE.ln())
  return Math.round(tick.toNumber())
}

export const calculatePrice = (tick: number): Decimal =>
  MIN_PRICE.mul(TICK_SIZE.pow(tick))
