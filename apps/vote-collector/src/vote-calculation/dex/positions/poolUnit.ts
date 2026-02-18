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
  StateVersion
} from '@radix-effects/shared'
import { FungibleResourceAddress } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import { Array as A, Effect, Option, pipe, Record as R } from 'effect'
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

/** Resolve pool unit data for all configured pools. */
const fetchPoolUnitData = (input: {
  pools: ReadonlyArray<{
    poolAddress: string
    lpResourceAddress: string
  }>
  stateVersion: StateVersion
  getFungibleBalance: Effect.Effect.Success<typeof GetFungibleBalance>
  stateEntityDetails: Effect.Effect.Success<typeof StateEntityDetails>
}) =>
  Effect.gen(function* () {
    if (input.pools.length === 0) return []

    // Fetch pool fungible balances and LP token details in parallel
    const [poolBalances, lpDetails] = yield* Effect.all(
      [
        input.getFungibleBalance({
          addresses: A.map(input.pools, (p) => p.poolAddress),
          at_ledger_state: { state_version: input.stateVersion }
        }),
        input.stateEntityDetails({
          addresses: A.map(input.pools, (p) => p.lpResourceAddress),
          at_ledger_state: { state_version: input.stateVersion }
        })
      ],
      { concurrency: 2 }
    )

    return pipe(
      input.pools,
      A.map((pool): PoolUnitData => {
        const totalSupply = pipe(
          lpDetails.items,
          A.findFirst((i) => i.address === pool.lpResourceAddress),
          Option.flatMap((item) => Option.fromNullable(item.details)),
          Option.filter(
            (d): d is Extract<typeof d, { type: 'FungibleResource' }> =>
              d.type === 'FungibleResource'
          ),
          Option.flatMap((d) => Option.fromNullable(d.total_supply)),
          Option.map((v) => new BigNumber(v)),
          Option.getOrElse(() => new BigNumber(0))
        )

        const poolResources = pipe(
          poolBalances,
          A.findFirst((b) => b.address === pool.poolAddress),
          Option.map((pd) => pd.items),
          Option.getOrElse((): typeof poolBalances[number]['items'] => []),
          A.map((item) => ({
            resourceAddress: item.resource_address,
            poolUnitValue: totalSupply.gt(0)
              ? item.amount.dividedBy(totalSupply)
              : new BigNumber(0)
          }))
        )

        return {
          poolAddress: pool.poolAddress,
          lpResourceAddress: pool.lpResourceAddress,
          totalSupply,
          poolResources
        }
      })
    )
  })

/** Compute a single account's pool-unit positions declaratively. */
const computeAccountPositions = (
  poolUnitData: ReadonlyArray<PoolUnitData>,
  getFungibleTokenBalance: (
    address: AccountAddress,
    resourceAddress: FungibleResourceAddress
  ) => Option.Option<string>,
  address: AccountAddress,
  tokenFilterCtx: TokenFilterContext
): { total: BigNumber; contributions: PoolContribution[] } =>
  pipe(
    poolUnitData,
    A.reduce(
      { total: new BigNumber(0), contributions: [] } as {
        total: BigNumber
        contributions: PoolContribution[]
      },
      (acc, pool) => {
        const lpBalance = getFungibleTokenBalance(
          address,
          FungibleResourceAddress.make(pool.lpResourceAddress)
        )

        if (Option.isNone(lpBalance)) return acc

        const userLp = new BigNumber(lpBalance.value)
        if (userLp.isZero()) return acc

        // Sum XRD from each underlying token in this pool
        const poolXrd = pipe(
          pool.poolResources,
          A.reduce(new BigNumber(0), (sum, resource) => {
            const userAmount = userLp.multipliedBy(resource.poolUnitValue)
            const xrdEquivalent = convertToXrd(
              resource.resourceAddress,
              userAmount.toFixed(),
              tokenFilterCtx
            )
            return sum.plus(xrdEquivalent)
          })
        )

        if (poolXrd.isZero()) return acc

        const poolName = pipe(
          Option.fromNullable(metaByPool.get(pool.poolAddress)),
          Option.map((m) => m.name),
          Option.getOrElse(() => pool.poolAddress)
        )

        return {
          total: acc.total.plus(poolXrd),
          contributions: [
            ...acc.contributions,
            {
              poolName,
              poolType: 'simple' as const,
              componentAddress: pool.poolAddress,
              xrdValue: poolXrd.toFixed()
            }
          ]
        }
      }
    )
  )

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
        const poolUnitData = yield* fetchPoolUnitData({
          pools: POOL_UNIT_POOLS,
          stateVersion: input.stateVersion,
          getFungibleBalance,
          stateEntityDetails
        })

        yield* Effect.log('PoolUnitPosition fetched pool data', {
          poolCount: poolUnitData.length
        })

        const getFungibleTokenBalance =
          yield* AccountBalanceState.createGetFungibleTokenBalanceFn

        const { totals, breakdown } = pipe(
          input.addresses,
          A.reduce(
            {
              totals: R.empty<AccountAddress, BigNumber>(),
              breakdown: R.empty<
                AccountAddress,
                readonly PoolContribution[]
              >()
            },
            (acc, address) => {
              const { total, contributions } = computeAccountPositions(
                poolUnitData,
                getFungibleTokenBalance,
                address,
                input.tokenFilterCtx
              )
              if (total.isZero()) return acc
              return {
                totals: R.set(acc.totals, address, total),
                breakdown: R.set(acc.breakdown, address, contributions)
              }
            }
          )
        )

        return { totals, breakdown }
      })
    })
  }
) {}
