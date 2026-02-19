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

import { GetComponentStateService } from '@radix-effects/gateway'
import { AccountAddress, type StateVersion } from '@radix-effects/shared'
import { Array as A, Effect, Option, pipe, Record as R } from 'effect'
import s from 'sbor-ez-mode'
import BigNumber from 'bignumber.js'
import {
  OCISWAP_PRECISION_POOLS_V1,
  OCISWAP_PRECISION_POOLS_V2
} from '../../constants/addresses'
import type { NftAccountBalance, PoolContribution, PrecisionPoolConfig } from '../../types'
import { convertToXrd, type TokenFilterContext } from '../../tokenFilter'
import { Decimal, removableAmounts, tickToPriceSqrt } from './tickCalculator'

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

const poolVersion = (pool: PrecisionPoolConfig): string =>
  pipe(
    OCISWAP_PRECISION_POOLS_V1,
    A.findFirst((p) => p.componentAddress === pool.componentAddress),
    Option.isSome
  )
    ? 'V1'
    : 'V2'

export class OciswapPrecisionPosition extends Effect.Service<OciswapPrecisionPosition>()(
  'OciswapPrecisionPosition',
  {
    dependencies: [GetComponentStateService.Default],
    effect: Effect.gen(function* () {
      const getComponentState = yield* GetComponentStateService

      return Effect.fn('OciswapPrecisionPosition')(function* (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
        tokenFilterCtx: TokenFilterContext
        nftBalances: { items: NftAccountBalance[] }
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
          Effect.catchTag('EntityNotFoundError', (error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                'Precision pool component not found at state version',
                { error }
              )
              return [] as { address: string; state: s.infer<typeof PrecisionPoolSchema> }[]
            })
          )
        )

        // Build lookup: componentAddress → pool state
        const stateByComponent = new Map(
          poolStates.map((ps) => [ps.address, ps.state])
        )

        // Build lookup: lpResourceAddress → pool config
        const poolByLpResource = new Map(
          allPrecisionPools.map((p) => [p.lpResourceAddress, p])
        )

        // Process each account declaratively
        return pipe(
          input.nftBalances.items,
          A.reduce(
            {
              totals: R.empty<AccountAddress, BigNumber>(),
              breakdown: R.empty<
                AccountAddress,
                readonly PoolContribution[]
              >()
            },
            (acc, accountNfts) => {
              const address = AccountAddress.make(accountNfts.address)

              const { accountTotal, contributions } = pipe(
                accountNfts.nonFungibleResources,
                A.reduce(
                  {
                    accountTotal: new BigNumber(0),
                    contributions: [] as PoolContribution[]
                  },
                  (innerAcc, nftResource) => {
                    const pool = poolByLpResource.get(
                      nftResource.resourceAddress
                    )
                    if (!pool) return innerAcc

                    const poolState = stateByComponent.get(
                      pool.componentAddress
                    )
                    if (!poolState) return innerAcc

                    const currentPriceSqrt = new Decimal(poolState.price_sqrt)

                    // Sum XRD from each NFT position in this pool
                    const poolXrd = pipe(
                      nftResource.items,
                      A.filterMap((nft) => {
                        if (!nft.sbor || nft.isBurned) return Option.none()
                        const parsed = LiquidityPositionSchema.safeParse(
                          nft.sbor
                        )
                        if (parsed.isErr()) return Option.none()

                        const pos = parsed.value
                        const liquidity = new Decimal(pos.liquidity)
                        if (liquidity.isZero()) return Option.none()

                        const leftPriceSqrt = tickToPriceSqrt(pos.left_bound)
                        const rightPriceSqrt = tickToPriceSqrt(pos.right_bound)

                        const [xAmount, yAmount] = removableAmounts(
                          liquidity,
                          currentPriceSqrt,
                          leftPriceSqrt,
                          rightPriceSqrt,
                          pool.divisibility_x,
                          pool.divisibility_y
                        )

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

                        return Option.some(
                          new BigNumber(xXrd).plus(yXrd)
                        )
                      }),
                      A.reduce(new BigNumber(0), (sum, xrd) => sum.plus(xrd))
                    )

                    return {
                      accountTotal: innerAcc.accountTotal.plus(poolXrd),
                      contributions: poolXrd.isZero()
                        ? innerAcc.contributions
                        : [
                            ...innerAcc.contributions,
                            {
                              poolName: `Ociswap Precision ${poolVersion(pool)}: ${pool.name}`,
                              poolType: 'precision' as const,
                              componentAddress: pool.componentAddress,
                              xrdValue: poolXrd.toFixed()
                            }
                          ]
                    }
                  }
                )
              )

              if (accountTotal.isZero()) return acc
              return {
                totals: R.set(acc.totals, address, accountTotal),
                breakdown: R.set(acc.breakdown, address, contributions)
              }
            }
          )
        )
      })
    })
  }
) {}
