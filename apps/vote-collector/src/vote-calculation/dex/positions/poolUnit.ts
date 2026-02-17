/**
 * Compute XRD-equivalent amounts from pool-unit-based (fungible LP) positions.
 *
 * Handles all pools that use standard fungible LP tokens:
 * - Ociswap basic pools & flex pools
 * - DefiPlaza pools (base + quote)
 * - CaviarNine simple pools & HLP
 *
 * For each pool, resolves the user's LP token balance into underlying tokens
 * using pool-unit values, then filters for XRD/LSU/LSULP via tokenFilter.
 */

import { GetFungibleBalance, StateEntityDetails } from '@radix-effects/gateway'
import type {
  AccountAddress,
  FungibleResourceAddress,
  StateVersion
} from '@radix-effects/shared'
import { FungibleResourceAddress as FRA } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import type { Context } from 'effect'
import { Effect, Option, Record as R } from 'effect'
import { AccountBalanceState } from 'shared/snapshot/accountBalanceState'
import { POOL_UNIT_POOLS } from '../constants/addresses'
import { convertToXrd, type TokenFilterContext } from '../tokenFilter'
import type { PoolContribution } from '../types'

type PoolUnitData = {
  readonly poolAddress: string
  readonly lpResourceAddress: string
  readonly totalSupply: BigNumber
  readonly poolResources: ReadonlyArray<{
    readonly resourceAddress: string
    readonly poolUnitValue: BigNumber
  }>
}

const metaByPool = new Map(
  POOL_UNIT_POOLS.map((p) => [p.poolAddress, { name: p.name }])
)

const fetchPoolUnitData = (
  getFungibleBalance: Context.Tag.Service<typeof GetFungibleBalance>,
  stateEntityDetails: Context.Tag.Service<typeof StateEntityDetails>,
  input: {
    pools: ReadonlyArray<{
      poolAddress: string
      lpResourceAddress: string
    }>
    stateVersion: StateVersion
  }
) =>
  Effect.gen(function* () {
    if (input.pools.length === 0) return []

    // Fetch pool fungible balances and LP token details in parallel
    const [poolBalances, lpDetails] = yield* Effect.all(
      [
        getFungibleBalance({
          addresses: input.pools.map((p) => p.poolAddress),
          at_ledger_state: { state_version: input.stateVersion }
        }),
        stateEntityDetails({
          addresses: input.pools.map((p) => p.lpResourceAddress),
          at_ledger_state: { state_version: input.stateVersion }
        })
      ],
      { concurrency: 2 }
    )

    return input.pools.map((pool): PoolUnitData => {
      const poolData = poolBalances.find(
        (b) => b.address === pool.poolAddress
      )
      const lpData = lpDetails.items.find(
        (i) => i.address === pool.lpResourceAddress
      )

      const totalSupply =
        lpData?.details?.type === 'FungibleResource'
          ? new BigNumber(lpData.details.total_supply ?? '0')
          : new BigNumber(0)

      const poolResources = (poolData?.items ?? []).map((item) => ({
        resourceAddress: item.resource_address,
        poolUnitValue: totalSupply.gt(0)
          ? item.amount.dividedBy(totalSupply)
          : new BigNumber(0)
      }))

      return {
        poolAddress: pool.poolAddress,
        lpResourceAddress: pool.lpResourceAddress,
        totalSupply,
        poolResources
      }
    })
  })

const computeAccountPositions = (
  poolUnitData: ReadonlyArray<PoolUnitData>,
  getFungibleTokenBalance: (
    address: AccountAddress,
    resourceAddress: FungibleResourceAddress
  ) => Option.Option<string>,
  address: AccountAddress,
  tokenFilterCtx: TokenFilterContext
): { total: BigNumber; contributions: PoolContribution[] } => {
  let total = new BigNumber(0)
  const contributions: PoolContribution[] = []

  for (const pool of poolUnitData) {
    const lpBalance = getFungibleTokenBalance(
      address,
      FRA.make(pool.lpResourceAddress)
    )

    if (Option.isNone(lpBalance)) continue

    const userLp = new BigNumber(lpBalance.value)
    if (userLp.isZero()) continue

    let poolXrd = new BigNumber(0)

    // For each underlying token in this pool, compute user's share and convert to XRD
    for (const resource of pool.poolResources) {
      const userAmount = userLp.multipliedBy(resource.poolUnitValue)
      const xrdEquivalent = convertToXrd(
        resource.resourceAddress,
        userAmount.toFixed(),
        tokenFilterCtx
      )
      poolXrd = poolXrd.plus(xrdEquivalent)
    }

    if (!poolXrd.isZero()) {
      const meta = metaByPool.get(pool.poolAddress)
      contributions.push({
        poolName: meta?.name ?? pool.poolAddress,
        poolType: 'simple',
        componentAddress: pool.poolAddress,
        xrdValue: poolXrd.toFixed()
      })
    }

    total = total.plus(poolXrd)
  }

  return { total, contributions }
}

export class PoolUnitPosition extends Effect.Service<PoolUnitPosition>()(
  'PoolUnitPosition',
  {
    dependencies: [GetFungibleBalance.Default, StateEntityDetails.Default],
    effect: Effect.gen(function* () {
      const getFungibleBalance = yield* GetFungibleBalance
      const stateEntityDetails = yield* StateEntityDetails

      return Effect.fn('PoolUnitPosition')(function* (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
        tokenFilterCtx: TokenFilterContext
      }) {
        // Fetch all pool unit data in one batch
        const poolUnitData = yield* fetchPoolUnitData(
          getFungibleBalance,
          stateEntityDetails,
          {
            pools: POOL_UNIT_POOLS,
            stateVersion: input.stateVersion
          }
        )

        yield* Effect.log('PoolUnitPosition fetched pool data', {
          poolCount: poolUnitData.length
        })

        const getFungibleTokenBalance =
          yield* AccountBalanceState.createGetFungibleTokenBalanceFn

        let totals = R.empty<AccountAddress, BigNumber>()
        let breakdown = R.empty<
          AccountAddress,
          readonly PoolContribution[]
        >()

        for (const address of input.addresses) {
          const { total, contributions } = computeAccountPositions(
            poolUnitData,
            getFungibleTokenBalance,
            address,
            input.tokenFilterCtx
          )
          if (total.isZero()) continue
          totals = R.set(totals, address, total)
          breakdown = R.set(breakdown, address, contributions)
        }

        return { totals, breakdown }
      })
    })
  }
) {}
