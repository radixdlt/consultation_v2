/**
 * Compute XRD-equivalent amounts from CaviarNine shape (concentrated liquidity)
 * pool positions.
 *
 * For each shape pool, fetches component state and bin map, then resolves
 * user's NFT liquidity receipts into underlying token amounts.
 * All amounts pass through tokenFilter for XRD conversion.
 *
 * Simplified from radix-incentives QuantaSwapState — no price bounds splitting,
 * sums all token amounts regardless of bin position.
 */

import { GetComponentStateService } from '@radix-effects/gateway'
import { AccountAddress, type StateVersion } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import { Array as A, Effect, Option, pipe, Record as R } from 'effect'
import s from 'sbor-ez-mode'
import { CAVIARNINE_SHAPE_POOLS } from '../../constants/addresses'
import { I192 } from './i192'
import {
  GetQuantaSwapBinMap,
  type BinMapData
} from './binMap'
import { convertToXrd, type TokenFilterContext } from '../../tokenFilter'
import type { NftAccountBalance, PoolContribution } from '../../types'

/** CaviarNine QuantaSwap component state schema */
const TickIndex = s.struct({
  kvs: s.internalAddress(),
  current: s.option(s.tuple([s.number()]))
})

const QuantaSwapSchema = s.struct({
  bin_span: s.number(),
  tick_index: TickIndex,
  bin_map: s.internalAddress(),
  active_x: s.decimal(),
  active_y: s.decimal(),
  active_total_claim: s.decimal()
})

/** NFT liquidity receipt schema */
const liquidityReceiptSchema = s.struct({
  liquidity_claims: s.map({
    key: s.number(),
    value: s.decimal()
  })
})

type ShapePoolState = {
  componentAddress: string
  token_x: string
  token_y: string
  currentTick: number | undefined
  binSpan: number
  binMap: BinMapData
  active_total_claim: I192
  active_x: I192
  active_y: I192
}

/** Compute the XRD-equivalent value from a set of liquidity claims. */
const computeClaimsXrd = (
  claims: Map<number, string>,
  poolState: ShapePoolState,
  tokenFilterCtx: TokenFilterContext
): Effect.Effect<BigNumber> =>
  Effect.gen(function* () {
    const {
      currentTick,
      active_total_claim,
      active_x,
      active_y,
      binMap,
      token_x,
      token_y
    } = poolState

    if (currentTick === undefined) return new BigNumber(0)

    const { amount_x, amount_y } = pipe(
      Array.from(claims.entries()),
      A.reduce(
        { amount_x: I192.zero(), amount_y: I192.zero() },
        (acc, [tick, claimAmount]) => {
          const bin = binMap.get(tick)

          // Bin below current tick → Y tokens only
          if (tick < currentTick && bin) {
            if (bin.total_claim.isZero()) return acc
            const share = new I192(claimAmount).divide(bin.total_claim)
            return {
              ...acc,
              amount_y: acc.amount_y.add(share.multiply(bin.amount))
            }
          }

          // Bin above current tick → X tokens only
          if (tick > currentTick && bin) {
            if (bin.total_claim.isZero()) return acc
            const share = new I192(claimAmount).divide(bin.total_claim)
            return {
              ...acc,
              amount_x: acc.amount_x.add(share.multiply(bin.amount))
            }
          }

          // Bin at current tick → both X and Y tokens
          if (tick === currentTick) {
            if (active_total_claim.isZero()) return acc
            const share = new I192(claimAmount).divide(active_total_claim)
            return {
              amount_x: acc.amount_x.add(active_x.multiply(share)),
              amount_y: acc.amount_y.add(active_y.multiply(share))
            }
          }

          return acc
        }
      )
    )

    const xXrd = convertToXrd(token_x, amount_x.toString(), tokenFilterCtx)
    const yXrd = convertToXrd(token_y, amount_y.toString(), tokenFilterCtx)
    return new BigNumber(xXrd).plus(yXrd)
  })

/** Pre-built lookup: componentAddress → pool config (avoids O(n*m) .find()) */
const poolByComponent = new Map(
  CAVIARNINE_SHAPE_POOLS.map((p) => [p.componentAddress, p])
)

export class CaviarNineShapePosition extends Effect.Service<CaviarNineShapePosition>()(
  'CaviarNineShapePosition',
  {
    dependencies: [GetComponentStateService.Default, GetQuantaSwapBinMap.Default],
    effect: Effect.gen(function* () {
      const getComponentState = yield* GetComponentStateService
      const getQuantaSwapBinMap = yield* GetQuantaSwapBinMap

      return Effect.fn('CaviarNineShapePosition')(function* (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
        tokenFilterCtx: TokenFilterContext
        nftBalances: { items: NftAccountBalance[] }
      }) {
        if (CAVIARNINE_SHAPE_POOLS.length === 0) {
          return { totals: R.empty(), breakdown: R.empty() }
        }

        // Fetch all shape pool component states
        const componentStates = yield* getComponentState.run({
          addresses: CAVIARNINE_SHAPE_POOLS.map((p) => p.componentAddress),
          schema: QuantaSwapSchema,
          at_ledger_state: { state_version: input.stateVersion }
        }).pipe(
          Effect.catchTag('EntityNotFoundError', (error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                'Shape pool component not found at state version',
                { error }
              )
              return [] as { address: string; state: s.infer<typeof QuantaSwapSchema> }[]
            })
          )
        )

        // Fetch bin maps for all pools in parallel
        const poolStates = yield* Effect.forEach(
          componentStates,
          (cs) =>
            Effect.gen(function* () {
              const pool = poolByComponent.get(cs.address)
              if (!pool) return Option.none()

              const binMap = yield* getQuantaSwapBinMap({
                address: cs.state.bin_map,
                at_ledger_state: { state_version: input.stateVersion }
              }).pipe(
                Effect.catchTag(
                  'EntityNotFoundError',
                  (): Effect.Effect<BinMapData> =>
                    Effect.succeed(new Map())
                )
              )

              const currentTick =
                cs.state.tick_index.current?.variant === 'Some'
                  ? cs.state.tick_index.current.value[0]
                  : undefined

              const poolState: ShapePoolState & {
                liquidityReceipt: string
                poolName: string
              } = {
                componentAddress: cs.address,
                token_x: pool.token_x,
                token_y: pool.token_y,
                currentTick,
                binSpan: cs.state.bin_span,
                binMap,
                active_total_claim: new I192(cs.state.active_total_claim),
                active_x: new I192(cs.state.active_x),
                active_y: new I192(cs.state.active_y),
                liquidityReceipt: pool.liquidity_receipt,
                poolName: pool.name
              }
              return Option.some(poolState)
            }),
          { concurrency: 5 }
        ).pipe(Effect.map(A.getSomes))

        yield* Effect.log('CaviarNineShapePosition fetched pool states', {
          poolCount: poolStates.length
        })

        // Build lookup: liquidityReceipt → pool state
        const poolByReceipt = new Map(
          poolStates.map((p) => [p.liquidityReceipt, p])
        )

        // Process each account
        return yield* Effect.reduce(
          input.nftBalances.items,
          {
            totals: R.empty<AccountAddress, BigNumber>(),
            breakdown: R.empty<
              AccountAddress,
              readonly PoolContribution[]
            >()
          },
          (acc, accountNfts) =>
            Effect.gen(function* () {
              const address = AccountAddress.make(accountNfts.address)

              const { accountTotal, contributions } = yield* Effect.reduce(
                accountNfts.nonFungibleResources,
                {
                  accountTotal: new BigNumber(0),
                  contributions: [] as PoolContribution[]
                },
                (innerAcc, nftResource) =>
                  Effect.gen(function* () {
                    const poolState = poolByReceipt.get(
                      nftResource.resourceAddress
                    )
                    if (!poolState) return innerAcc

                    const validClaims = pipe(
                      nftResource.items,
                      A.filterMap((nft) => {
                        if (!nft.sbor || nft.isBurned) return Option.none()
                        const parsed = liquidityReceiptSchema.safeParse(
                          nft.sbor
                        )
                        return parsed.isOk()
                          ? Option.some(parsed.value.liquidity_claims)
                          : Option.none()
                      })
                    )

                    const claimXrds = yield* Effect.forEach(
                      validClaims,
                      (claims) =>
                        computeClaimsXrd(
                          claims,
                          poolState,
                          input.tokenFilterCtx
                        )
                    )

                    const poolXrd = pipe(
                      claimXrds,
                      A.reduce(new BigNumber(0), (sum, xrd) => sum.plus(xrd))
                    )

                    return {
                      accountTotal: innerAcc.accountTotal.plus(poolXrd),
                      contributions: poolXrd.isZero()
                        ? innerAcc.contributions
                        : [
                            ...innerAcc.contributions,
                            {
                              poolName: `CaviarNine Shape: ${poolState.poolName}`,
                              poolType: 'shape' as const,
                              componentAddress: poolState.componentAddress,
                              xrdValue: poolXrd.toFixed()
                            }
                          ]
                    }
                  })
              )

              if (accountTotal.isZero()) return acc
              return {
                totals: R.set(acc.totals, address, accountTotal),
                breakdown: R.set(acc.breakdown, address, contributions)
              }
            })
        )
      })
    })
  }
) {}
