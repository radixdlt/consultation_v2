/**
 * Time-versioned vote power source configuration.
 *
 * Each "epoch" defines which source categories (XRD, LSU, LSULP, pool units,
 * precision pools, shape pools) are enabled and which pool addresses apply.
 * When calculating vote power for a proposal, find the epoch whose
 * `effectiveFrom <= proposal.start` (newest matching epoch wins).
 *
 * Source toggles use a Set — adding a new primitive source type only requires
 * extending the VotePowerSource union. Pool arrays are optional and default to
 * empty. Neither change requires updating existing epochs.
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

export type VotePowerSource = 'xrd' | 'lsu' | 'lsulp'

/** Epoch definition — pool arrays are optional (default: empty). */
export type VotePowerEpochConfig = {
  readonly effectiveFrom: Date
  readonly sources: ReadonlySet<VotePowerSource>
  readonly precisionPoolsV1?: readonly PrecisionPoolConfig[]
  readonly precisionPoolsV2?: readonly PrecisionPoolConfig[]
  readonly poolUnitPools?: readonly PoolUnitPoolConfig[]
  readonly shapePools?: readonly ShapePoolConfig[]
}

/** Resolved config with defaults applied — all fields guaranteed present. */
export type VotePowerSourceConfig = {
  readonly effectiveFrom: Date
  readonly sources: ReadonlySet<VotePowerSource>
  readonly precisionPoolsV1: readonly PrecisionPoolConfig[]
  readonly precisionPoolsV2: readonly PrecisionPoolConfig[]
  readonly poolUnitPools: readonly PoolUnitPoolConfig[]
  readonly shapePools: readonly ShapePoolConfig[]
}

const resolveEpoch = (epoch: VotePowerEpochConfig): VotePowerSourceConfig => ({
  effectiveFrom: epoch.effectiveFrom,
  sources: epoch.sources,
  precisionPoolsV1: epoch.precisionPoolsV1 ?? [],
  precisionPoolsV2: epoch.precisionPoolsV2 ?? [],
  poolUnitPools: epoch.poolUnitPools ?? [],
  shapePools: epoch.shapePools ?? []
})

/**
 * Ordered newest-first. When adding a new epoch, prepend it to this array.
 * Omitted pool arrays default to empty.
 *
 * Example — disable everything except XRD starting June 2026:
 * ```ts
 * {
 *   effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
 *   sources: new Set(['xrd'])
 * }
 * ```
 */
export const VOTE_POWER_EPOCHS: readonly VotePowerEpochConfig[] = [
  // Epoch 0: Original config (catches all proposals from the beginning)
  {
    effectiveFrom: new Date(0),
    sources: new Set<VotePowerSource>(['xrd', 'lsu', 'lsulp']),
    precisionPoolsV1: [...OCISWAP_PRECISION_POOLS_V1_EPOCH_0],
    precisionPoolsV2: [...OCISWAP_PRECISION_POOLS_V2_EPOCH_0],
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
  epochs: readonly VotePowerEpochConfig[],
  proposalStartDate: Date
): VotePowerSourceConfig => {
  const match = epochs.find(
    (epoch) => epoch.effectiveFrom <= proposalStartDate
  )
  return resolveEpoch(match ?? epochs[epochs.length - 1])
}

/** Convenience wrapper that uses the production VOTE_POWER_EPOCHS. */
export const getVotePowerConfig = (
  proposalStartDate: Date
): VotePowerSourceConfig => findEpoch(VOTE_POWER_EPOCHS, proposalStartDate)
