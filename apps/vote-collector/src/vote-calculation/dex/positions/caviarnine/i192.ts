/**
 * I192 class to mimic Scrypto Decimal's I192 behavior.
 *
 * 192-bit representation of fixed-scale decimal numbers with 18 decimal places,
 * matching Scrypto's Decimal type. Performs truncation toward zero after each
 * operation to match Scrypto's behavior.
 *
 * Copied from radix-incentives/packages/api/src/common/helpers/i192.ts
 */

import DecimalJs from 'decimal.js'

/** Isolated Decimal constructor to avoid global config conflicts with other modules. */
const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_DOWN })
type Decimal = DecimalJs

export class I192 {
  private static readonly DECIMALS = 18
  private static readonly DECIMAL_FACTOR = new Decimal(10).pow(I192.DECIMALS)

  private value: Decimal

  constructor(value: string | number | Decimal) {
    if (typeof value === 'string' || typeof value === 'number') {
      this.value = new Decimal(value)
    } else {
      this.value = value
    }
    this.value = this.truncateToDecimals(this.value)
  }

  private truncateToDecimals(value: Decimal): Decimal {
    const multiplied = value.times(I192.DECIMAL_FACTOR)
    const truncated = value.isNegative()
      ? multiplied.ceil()
      : multiplied.floor()
    return truncated.dividedBy(I192.DECIMAL_FACTOR)
  }

  public static zero(): I192 {
    return new I192(0)
  }

  public static one(): I192 {
    return new I192(1)
  }

  public add(other: I192 | string | number | Decimal): I192 {
    const otherValue = other instanceof I192 ? other.value : new Decimal(other)
    const truncatedOther = this.truncateToDecimals(otherValue)
    const result = this.truncateToDecimals(this.value.plus(truncatedOther))
    return new I192(result)
  }

  public multiply(other: I192 | string | number | Decimal): I192 {
    const otherValue = other instanceof I192 ? other.value : new Decimal(other)
    const truncatedOther = this.truncateToDecimals(otherValue)
    const result = this.truncateToDecimals(this.value.times(truncatedOther))
    return new I192(result)
  }

  public divide(other: I192 | string | number | Decimal): I192 {
    const otherValue = other instanceof I192 ? other.value : new Decimal(other)
    const truncatedOther = this.truncateToDecimals(otherValue)
    if (truncatedOther.isZero()) {
      return I192.zero()
    }
    const result = this.truncateToDecimals(
      this.value.dividedBy(truncatedOther)
    )
    return new I192(result)
  }

  public isZero(): boolean {
    return this.value.isZero()
  }

  public toString(): string {
    return this.value.toFixed(I192.DECIMALS)
  }

  public toDecimal(): Decimal {
    return new Decimal(this.value)
  }
}
