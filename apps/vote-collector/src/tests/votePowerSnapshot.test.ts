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
import fixture from './fixtures/votePowerSnapshot.fixture.json'

const MainnetGovernanceConfig = Layer.succeed(GovernanceConfig, {
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

describe('Vote Power Snapshot', () => {
  it(
    'matches fixture for known account at known state version',
    { timeout: 120_000 },
    async () => {
      const account = fixture.account
      const stateVersion = StateVersion.make(fixture.stateVersion)

      const accountAddress = AccountAddress.make(account)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const votePowerSnapshot = yield* VotePowerSnapshot
          const addresses = [accountAddress]

          return yield* votePowerSnapshot({ addresses, stateVersion })
        }).pipe(Effect.provide(TestLayer))
      )

      const total = R.get(result.votePower, accountAddress).pipe(
        Option.map((bn) => bn.toFixed()),
        Option.getOrElse(() => '0')
      )

      expect(total).toBe(fixture.total)

      const dexBreakdown = R.get(result.breakdown, accountAddress).pipe(
        Option.getOrElse(() => [] as const)
      )

      expect(dexBreakdown).toEqual(fixture.dexBreakdown)
    }
  )
})
