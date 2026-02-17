/** Pool configuration types matching radix-incentives shapes for maximum code reuse. */

/** Per-pool XRD contribution for accounting / diagnostic purposes. */
export type PoolContribution = {
  readonly poolName: string
  readonly poolType: 'simple' | 'precision' | 'shape' | 'lsulp'
  readonly componentAddress: string
  readonly xrdValue: string
}

export type PrecisionPoolConfig = {
  readonly name: string
  readonly componentAddress: string
  readonly lpResourceAddress: string
  readonly token_x: string
  readonly token_y: string
  readonly divisibility_x: number
  readonly divisibility_y: number
}

export type ShapePoolConfig = {
  readonly name: string
  readonly componentAddress: string
  readonly token_x: string
  readonly token_y: string
  readonly liquidity_receipt: string
}

export type PoolUnitPoolConfig = {
  readonly name: string
  readonly poolAddress: string
  readonly lpResourceAddress: string
}
