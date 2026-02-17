/**
 * Compute XRD-equivalent amounts from Ociswap precision (concentrated liquidity)
 * pool positions.
 *
 * For each precision pool, fetches the component state and user's NFT liquidity
 * receipts, then calculates underlying token amounts using tick math.
 * All amounts pass through tokenFilter for XRD conversion.
 *
 * Simplified from radix-incentives PrecisionPoolState — no price bounds splitting,
 * sums all token amounts regardless of position range.
 */

import {
  GetComponentStateService,
  GetNonFungibleBalanceService
} from '@radix-effects/gateway'
import type { AccountAddress, StateVersion } from '@radix-effects/shared'
import { Decimal } from 'decimal.js'
import { Effect, Record as R } from 'effect'
import s from 'sbor-ez-mode'
import BigNumber from 'bignumber.js'
import {
  OCISWAP_PRECISION_POOLS_V1,
  OCISWAP_PRECISION_POOLS_V2
} from '../../constants/addresses'
import type { PoolContribution, PrecisionPoolConfig } from '../../types'
import { convertToXrd, type TokenFilterContext } from '../../tokenFilter'
import { removableAmounts, tickToPriceSqrt } from './tickCalculator'

/** Simplified component state schema — only fields we need */
const PrecisionPoolSchema = s.struct({
  price_sqrt: s.decimal(),
  active_tick: s.option(s.number())
})

/** NFT liquidity position data */
const LiquidityPositionSchema = s.struct({
  liquidity: s.decimal(),
  left_bound: s.number(),
  right_bound: s.number()
})

const allPrecisionPools: readonly PrecisionPoolConfig[] = [
  ...OCISWAP_PRECISION_POOLS_V1,
  ...OCISWAP_PRECISION_POOLS_V2
]

const allLpResourceAddresses = allPrecisionPools.map(
  (p) => p.lpResourceAddress
)

const poolVersion = (pool: PrecisionPoolConfig): string =>
  OCISWAP_PRECISION_POOLS_V1.some(
    (p) => p.componentAddress === pool.componentAddress
  )
    ? 'V1'
    : 'V2'

export class OciswapPrecisionPosition extends Effect.Service<OciswapPrecisionPosition>()(
  'OciswapPrecisionPosition',
  {
    dependencies: [
      GetComponentStateService.Default,
      GetNonFungibleBalanceService.Default
    ],
    effect: Effect.gen(function* () {
      const getComponentState = yield* GetComponentStateService
      const getNonFungibleBalance = yield* GetNonFungibleBalanceService

      return Effect.fn('OciswapPrecisionPosition')(function* (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
        tokenFilterCtx: TokenFilterContext
      }) {
        if (allPrecisionPools.length === 0) {
          return { totals: R.empty(), breakdown: R.empty() }
        }

        // Fetch all precision pool component states
        const poolStates = yield* getComponentState.run({
          addresses: allPrecisionPools.map((p) => p.componentAddress),
          schema: PrecisionPoolSchema,
          at_ledger_state: { state_version: input.stateVersion }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                'Failed to fetch precision pool states',
                { error }
              )
              return [] as { address: string; state: s.infer<typeof PrecisionPoolSchema> }[]
            })
          )
        )

        // Build lookup: componentAddress → pool state
        const stateByComponent = new Map(
          poolStates.map((s) => [s.address, s.state])
        )

        // Fetch all NFT receipts for all accounts (filtered by precision pool LP resources)
        const nftBalances = yield* getNonFungibleBalance({
          addresses: input.addresses as string[],
          at_ledger_state: { state_version: input.stateVersion },
          resourceAddresses: allLpResourceAddresses
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                'Failed to fetch precision pool NFTs',
                { error }
              )
              return { items: [] }
            })
          )
        )

        // Build lookup: lpResourceAddress → pool config
        const poolByLpResource = new Map(
          allPrecisionPools.map((p) => [p.lpResourceAddress, p])
        )

        // Process each account
        let totals = R.empty<AccountAddress, BigNumber>()
        let breakdown = R.empty<
          AccountAddress,
          readonly PoolContribution[]
        >()

        for (const accountNfts of nftBalances.items) {
          let accountTotal = new BigNumber(0)
          const contributions: PoolContribution[] = []
          const address = accountNfts.address as AccountAddress

          for (const nftResource of accountNfts.nonFungibleResources) {
            const pool = poolByLpResource.get(
              nftResource.resourceAddress
            )
            if (!pool) continue

            const poolState = stateByComponent.get(
              pool.componentAddress
            )
            if (!poolState) continue

            const currentPriceSqrt = new Decimal(poolState.price_sqrt)
            let poolXrd = new BigNumber(0)

            // Parse each NFT's liquidity position data
            for (const nft of nftResource.items) {
              if (!nft.sbor || nft.isBurned) continue

              const parsed = LiquidityPositionSchema.safeParse(nft.sbor)
              if (parsed.isErr()) continue

              const pos = parsed.value
              const liquidity = new Decimal(pos.liquidity)
              if (liquidity.isZero()) continue

              const leftPriceSqrt = tickToPriceSqrt(pos.left_bound)
              const rightPriceSqrt = tickToPriceSqrt(pos.right_bound)

              // Calculate total token amounts (no bounds splitting)
              const [xAmount, yAmount] = removableAmounts(
                liquidity,
                currentPriceSqrt,
                leftPriceSqrt,
                rightPriceSqrt,
                pool.divisibility_x,
                pool.divisibility_y
              )

              // Convert each underlying token to XRD
              const xXrd = convertToXrd(
                pool.token_x,
                xAmount.toString(),
                input.tokenFilterCtx
              )
              const yXrd = convertToXrd(
                pool.token_y,
                yAmount.toString(),
                input.tokenFilterCtx
              )

              poolXrd = poolXrd.plus(xXrd).plus(yXrd)
            }

            if (!poolXrd.isZero()) {
              contributions.push({
                poolName: `Ociswap Precision ${poolVersion(pool)}: ${pool.name}`,
                poolType: 'precision',
                componentAddress: pool.componentAddress,
                xrdValue: poolXrd.toFixed()
              })
            }

            accountTotal = accountTotal.plus(poolXrd)
          }

          if (accountTotal.isZero()) continue
          totals = R.set(totals, address, accountTotal)
          breakdown = R.set(breakdown, address, contributions)
        }

        return { totals, breakdown }
      })
    })
  }
) {}
