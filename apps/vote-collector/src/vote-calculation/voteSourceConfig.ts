/**
 * Time-versioned vote power source configuration.
 *
 * Each "epoch" defines which source categories (XRD, LSU, LSULP, pool units,
 * precision pools, shape pools) are enabled and which pool addresses apply.
 * When calculating vote power for a proposal, find the epoch whose
 * `effectiveFrom <= proposal.start` (newest matching epoch wins).
 *
 * To change which sources count toward vote power, prepend a new epoch to
 * VOTE_POWER_EPOCHS — old epochs remain intact for historical recalculation.
 */

import {
  CAVIARNINE_SHAPE_POOLS_EPOCH_0,
  OCISWAP_PRECISION_POOLS_V1_EPOCH_0,
  OCISWAP_PRECISION_POOLS_V2_EPOCH_0,
  POOL_UNIT_POOLS_EPOCH_0
} from './dex/constants/addresses'
import type {
  PrecisionPoolConfig,
  PoolUnitPoolConfig,
  ShapePoolConfig
} from './dex/types'

export type VotePowerSourceConfig = {
  readonly effectiveFrom: Date
  readonly sources: {
    readonly xrd: boolean
    readonly lsu: boolean
    readonly lsulp: boolean
  }
  readonly precisionPools: readonly PrecisionPoolConfig[]
  readonly poolUnitPools: readonly PoolUnitPoolConfig[]
  readonly shapePools: readonly ShapePoolConfig[]
}

/**
 * Ordered newest-first. When adding a new epoch, prepend it to this array.
 *
 * Example — disable everything except XRD starting June 2026:
 * ```ts
 * {
 *   effectiveFrom: new Date('2026-06-01'),
 *   sources: { xrd: true, lsu: false, lsulp: false },
 *   precisionPools: [],
 *   poolUnitPools: [],
 *   shapePools: []
 * }
 * ```
 */
export const VOTE_POWER_EPOCHS: readonly VotePowerSourceConfig[] = [
  // Epoch 0: Original config (catches all proposals from the beginning)
  {
    effectiveFrom: new Date(0),
    sources: { xrd: true, lsu: true, lsulp: true },
    precisionPools: [
      ...OCISWAP_PRECISION_POOLS_V1_EPOCH_0,
      ...OCISWAP_PRECISION_POOLS_V2_EPOCH_0
    ],
    poolUnitPools: [...POOL_UNIT_POOLS_EPOCH_0],
    shapePools: [...CAVIARNINE_SHAPE_POOLS_EPOCH_0]
  }
]

/**
 * Find the epoch whose `effectiveFrom <= proposalStartDate` (newest matching
 * epoch wins). Falls back to the oldest epoch if none match.
 *
 * Exported separately so tests can exercise the lookup with custom epoch arrays.
 */
export const findEpoch = (
  epochs: readonly VotePowerSourceConfig[],
  proposalStartDate: Date
): VotePowerSourceConfig => {
  const match = epochs.find(
    (epoch) => epoch.effectiveFrom <= proposalStartDate
  )
  return match ?? epochs[epochs.length - 1]
}

/** Convenience wrapper that uses the production VOTE_POWER_EPOCHS. */
export const getVotePowerConfig = (
  proposalStartDate: Date
): VotePowerSourceConfig => findEpoch(VOTE_POWER_EPOCHS, proposalStartDate)
