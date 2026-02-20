/**
 * Vote Power Snapshot — run against mainnet to verify the full voting
 * power breakdown (XRD + LSU + DEX) matches a known fixture.
 *
 * Usage:
 *   pnpm --filter vote-collector test run src/__tests__/votePowerSnapshot.test.ts
 */

import {
  AccountAddress,
  ComponentAddress,
  FungibleResourceAddress,
  PackageAddress,
  StateVersion
} from '@radix-effects/shared'
import {
  ConfigProvider,
  Effect,
  Layer,
  Logger,
  Option,
  Record as R
} from 'effect'
import { describe, expect, it } from 'vitest'
import { MainnetGatewayApiClientLayer } from 'shared/gateway'
import { GovernanceConfig } from 'shared/governance/index'
import { VotePowerSnapshot } from '../vote-calculation/votePowerSnapshot'
import {
  findEpoch,
  getVotePowerConfig,
  VOTE_POWER_EPOCHS,
  type VotePowerEpochConfig,
  type VotePowerSourceConfig
} from '../vote-calculation/voteSourceConfig'
import fixture from './fixtures/votePowerSnapshot.fixture.json'

const MainnetGovernanceConfig = Layer.succeed(GovernanceConfig, {
  packageAddress: PackageAddress.make(''),
  componentAddress: ComponentAddress.make(
    'component_rdx1cqnp3rptnwqjc4r7kzwkctec09jkdqa8v2rue580kw66fvt4ctpnmc'
  ),
  adminBadgeAddress: FungibleResourceAddress.make(
    'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd'
  ),
  xrdResourceAddress: FungibleResourceAddress.make(
    'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd'
  )
})

const TestLayer = VotePowerSnapshot.Default.pipe(
  Layer.provide(MainnetGatewayApiClientLayer),
  Layer.provideMerge(MainnetGovernanceConfig),
  Layer.provide(
    Layer.setConfigProvider(ConfigProvider.fromJson({ NETWORK_ID: 1 }))
  ),
  Layer.provideMerge(Logger.pretty)
)

const allSourcesConfig = getVotePowerConfig(new Date(0))

const runSnapshot = (
  sourceConfig: VotePowerSourceConfig,
  accountAddress: AccountAddress,
  stateVersion: StateVersion
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const votePowerSnapshot = yield* VotePowerSnapshot
      return yield* votePowerSnapshot({
        addresses: [accountAddress],
        stateVersion,
        sourceConfig
      })
    }).pipe(Effect.provide(TestLayer))
  )

const getTotal = (
  result: { votePower: R.ReadonlyRecord<AccountAddress, import('bignumber.js').default> },
  accountAddress: AccountAddress
) =>
  R.get(result.votePower, accountAddress).pipe(
    Option.map((bn) => bn.toFixed()),
    Option.getOrElse(() => '0')
  )

describe('Vote Power Snapshot', () => {
  it(
    'matches fixture for known account at known state version',
    { timeout: 120_000 },
    async () => {
      const accountAddress = AccountAddress.make(fixture.account)
      const stateVersion = StateVersion.make(fixture.stateVersion)

      const result = await runSnapshot(
        allSourcesConfig,
        accountAddress,
        stateVersion
      )

      expect(getTotal(result, accountAddress)).toBe(fixture.total)

      const dexBreakdown = R.get(result.breakdown, accountAddress).pipe(
        Option.getOrElse(() => [] as const)
      )
      expect(dexBreakdown).toEqual(fixture.dexBreakdown)
    }
  )

  it(
    'disabling sources progressively reduces vote power',
    { timeout: 120_000 },
    async () => {
      const accountAddress = AccountAddress.make(fixture.account)
      const stateVersion = StateVersion.make(fixture.stateVersion)
      const epoch0 = VOTE_POWER_EPOCHS[0]

      // Resolve an epoch config (with defaults) into a VotePowerSourceConfig
      const resolve = (config: Omit<VotePowerEpochConfig, 'effectiveFrom'>) =>
        findEpoch([{ effectiveFrom: new Date(0), ...config }], new Date(0))

      // Step 1: Disable shape pools
      const noShapeConfig = resolve({
        sources: epoch0.sources,
        precisionPoolsV1: epoch0.precisionPoolsV1,
        precisionPoolsV2: epoch0.precisionPoolsV2,
        poolUnitPools: epoch0.poolUnitPools
      })
      const noShapeResult = await runSnapshot(
        noShapeConfig,
        accountAddress,
        stateVersion
      )
      const noShapeTotal = Number(getTotal(noShapeResult, accountAddress))
      expect(noShapeTotal).toBeLessThan(Number(fixture.total))

      // Step 2: Also disable precision pools
      const noPrecisionConfig = resolve({
        sources: epoch0.sources,
        poolUnitPools: epoch0.poolUnitPools
      })
      const noPrecisionResult = await runSnapshot(
        noPrecisionConfig,
        accountAddress,
        stateVersion
      )
      const noPrecisionTotal = Number(
        getTotal(noPrecisionResult, accountAddress)
      )
      expect(noPrecisionTotal).toBeLessThan(noShapeTotal)

      // Step 3: Also disable pool unit pools
      const noPoolUnitConfig = resolve({
        sources: epoch0.sources
      })
      const noPoolUnitResult = await runSnapshot(
        noPoolUnitConfig,
        accountAddress,
        stateVersion
      )
      const noPoolUnitTotal = Number(
        getTotal(noPoolUnitResult, accountAddress)
      )
      expect(noPoolUnitTotal).toBeLessThan(noPrecisionTotal)

      // Step 4: Also disable LSULP
      const noLsulpConfig = resolve({
        sources: new Set(['xrd', 'lsu'])
      })
      const noLsulpResult = await runSnapshot(
        noLsulpConfig,
        accountAddress,
        stateVersion
      )
      const noLsulpTotal = Number(getTotal(noLsulpResult, accountAddress))
      expect(noLsulpTotal).toBeLessThan(noPoolUnitTotal)

      // Step 5: Also disable LSU → XRD-only
      const xrdOnlyConfig = resolve({
        sources: new Set(['xrd'])
      })
      const xrdOnlyResult = await runSnapshot(
        xrdOnlyConfig,
        accountAddress,
        stateVersion
      )
      const xrdOnlyTotal = Number(getTotal(xrdOnlyResult, accountAddress))
      expect(xrdOnlyTotal).toBeLessThan(noLsulpTotal)

      // XRD-only should have no pool breakdown
      const xrdBreakdown = R.get(
        xrdOnlyResult.breakdown,
        accountAddress
      ).pipe(Option.getOrElse(() => [] as const))
      expect(xrdBreakdown).toEqual([])
    }
  )
})

describe('findEpoch', () => {
  it('returns the correct epoch for a given date', () => {
    // With only epoch 0 (effectiveFrom: Date(0)), all dates should return it
    const config = getVotePowerConfig(new Date('2025-01-01'))
    expect(config.effectiveFrom).toStrictEqual(new Date(0))
    expect(config.sources.has('xrd')).toBe(true)
    expect(config.sources.has('lsu')).toBe(true)
    expect(config.sources.has('lsulp')).toBe(true)
    expect(
      config.precisionPoolsV1.length + config.precisionPoolsV2.length
    ).toBeGreaterThan(0)
    expect(config.poolUnitPools.length).toBeGreaterThan(0)
    expect(config.shapePools.length).toBeGreaterThan(0)
  })

  it('selects the correct epoch when multiple epochs exist', () => {
    const epoch0: VotePowerEpochConfig = {
      effectiveFrom: new Date(0),
      sources: new Set(['xrd', 'lsu', 'lsulp'])
    }

    const epoch1: VotePowerEpochConfig = {
      effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
      sources: new Set(['xrd'])
    }

    // Ordered newest-first (same as VOTE_POWER_EPOCHS convention)
    const epochs = [epoch1, epoch0]

    // Before epoch 1 → should get epoch 0
    expect(findEpoch(epochs, new Date('2025-01-01')).effectiveFrom).toStrictEqual(epoch0.effectiveFrom)

    // After epoch 1 → should get epoch 1
    expect(findEpoch(epochs, new Date('2026-07-01')).effectiveFrom).toStrictEqual(epoch1.effectiveFrom)

    // Boundary: effectiveFrom is inclusive
    expect(findEpoch(epochs, new Date('2026-06-01T00:00:00.000Z')).effectiveFrom).toStrictEqual(epoch1.effectiveFrom)
  })
})
