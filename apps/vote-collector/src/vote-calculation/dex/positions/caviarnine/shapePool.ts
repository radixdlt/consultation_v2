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

import {
  GetComponentStateService,
  GetNonFungibleBalanceService
} from '@radix-effects/gateway'
import type { AccountAddress, StateVersion } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import { Effect, Record as R } from 'effect'
import s from 'sbor-ez-mode'
import { CAVIARNINE_SHAPE_POOLS } from '../../constants/addresses'
import { I192 } from './i192'
import {
  GetQuantaSwapBinMap,
  type BinMapData
} from './binMap'
import { convertToXrd, type TokenFilterContext } from '../../tokenFilter'
import type { PoolContribution } from '../../types'

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

const computeClaimsXrd = (
  claims: Map<number, string>,
  poolState: ShapePoolState,
  tokenFilterCtx: TokenFilterContext
): BigNumber => {
  let totalXrd = new BigNumber(0)

  const {
    currentTick,
    active_total_claim,
    active_x,
    active_y,
    binMap,
    token_x,
    token_y
  } = poolState

  if (currentTick === undefined) return totalXrd

  let amount_x = I192.zero()
  let amount_y = I192.zero()

  for (const [tick, claimAmount] of claims.entries()) {
    const bin = binMap.get(tick)

    // Bin below current tick → Y tokens only
    if (tick < currentTick && bin) {
      const share = new I192(claimAmount).divide(bin.total_claim)
      amount_y = amount_y.add(share.multiply(bin.amount))
    }

    // Bin above current tick → X tokens only
    if (tick > currentTick && bin) {
      const share = new I192(claimAmount).divide(bin.total_claim)
      amount_x = amount_x.add(share.multiply(bin.amount))
    }

    // Bin at current tick → both X and Y tokens
    if (tick === currentTick) {
      const share = new I192(claimAmount).divide(active_total_claim)
      amount_x = amount_x.add(active_x.multiply(share))
      amount_y = amount_y.add(active_y.multiply(share))
    }
  }

  const xXrd = convertToXrd(token_x, amount_x.toString(), tokenFilterCtx)
  const yXrd = convertToXrd(token_y, amount_y.toString(), tokenFilterCtx)

  totalXrd = totalXrd.plus(xXrd).plus(yXrd)
  return totalXrd
}

const allLiquidityReceiptAddresses = CAVIARNINE_SHAPE_POOLS.map(
  (p) => p.liquidity_receipt
)

export class CaviarNineShapePosition extends Effect.Service<CaviarNineShapePosition>()(
  'CaviarNineShapePosition',
  {
    dependencies: [
      GetComponentStateService.Default,
      GetNonFungibleBalanceService.Default,
      GetQuantaSwapBinMap.Default
    ],
    effect: Effect.gen(function* () {
      const getComponentState = yield* GetComponentStateService
      const getNonFungibleBalance = yield* GetNonFungibleBalanceService
      const getQuantaSwapBinMap = yield* GetQuantaSwapBinMap

      return Effect.fn('CaviarNineShapePosition')(function* (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
        tokenFilterCtx: TokenFilterContext
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
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                'Failed to fetch shape pool states',
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
              const pool = CAVIARNINE_SHAPE_POOLS.find(
                (p) => p.componentAddress === cs.address
              )
              if (!pool) return undefined

              const binMap = yield* getQuantaSwapBinMap({
                address: cs.state.bin_map,
                at_ledger_state: { state_version: input.stateVersion }
              }).pipe(
                Effect.catchAll(() =>
                  Effect.succeed(new Map() as BinMapData)
                )
              )

              const currentTick =
                cs.state.tick_index.current?.variant === 'Some'
                  ? cs.state.tick_index.current.value[0]
                  : undefined

              return {
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
              } as ShapePoolState & {
                liquidityReceipt: string
                poolName: string
              }
            }),
          { concurrency: 5 }
        ).pipe(
          Effect.map((items) =>
            items.filter(
              (item): item is NonNullable<typeof item> => item !== undefined
            )
          )
        )

        yield* Effect.log('CaviarNineShapePosition fetched pool states', {
          poolCount: poolStates.length
        })

        // Build lookup: liquidityReceipt → pool state
        const poolByReceipt = new Map(
          poolStates.map((p) => [p.liquidityReceipt, p])
        )

        // Fetch all NFT receipts for all accounts
        const nftBalances = yield* getNonFungibleBalance({
          addresses: input.addresses as string[],
          at_ledger_state: { state_version: input.stateVersion },
          resourceAddresses: allLiquidityReceiptAddresses
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                'Failed to fetch shape pool NFTs',
                { error }
              )
              return { items: [] }
            })
          )
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
            const poolState = poolByReceipt.get(
              nftResource.resourceAddress
            )
            if (!poolState) continue

            let poolXrd = new BigNumber(0)

            for (const nft of nftResource.items) {
              if (!nft.sbor || nft.isBurned) continue

              const parsed = liquidityReceiptSchema.safeParse(nft.sbor)
              if (parsed.isErr()) continue

              const xrd = computeClaimsXrd(
                parsed.value.liquidity_claims,
                poolState,
                input.tokenFilterCtx
              )
              poolXrd = poolXrd.plus(xrd)
            }

            if (!poolXrd.isZero()) {
              contributions.push({
                poolName: `CaviarNine Shape: ${poolState.poolName}`,
                poolType: 'shape',
                componentAddress: poolState.componentAddress,
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
