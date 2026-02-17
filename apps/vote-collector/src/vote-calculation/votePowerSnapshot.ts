/**
 * VotePowerSnapshot — unified service that captures the XRD-equivalent
 * voting power for a set of accounts at a specific ledger state version.
 *
 * Replaces the old Snapshot + DexSnapshot pair, eliminating duplicate
 * gateway calls for fungible balances, validators, and LSU redemption values.
 *
 * Computes:
 * - XRD direct holdings               (all networks)
 * - LSU holdings (all validators) → XRD  (all networks)
 * - LSULP direct holdings → XRD          (mainnet only)
 * - Pool-unit LP tokens → XRD            (mainnet only)
 * - Ociswap precision pool positions → XRD (mainnet only)
 * - CaviarNine shape pool positions → XRD  (mainnet only)
 */

import {
  GetFungibleBalance,
  StateEntityDetails
} from '@radix-effects/gateway'
import {
  type AccountAddress,
  FungibleResourceAddress,
  type StateVersion
} from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import {
  Array as A,
  Config,
  Effect,
  HashMap,
  Option,
  pipe,
  Record as R
} from 'effect'
import {
  AccountBalanceState,
  FungibleTokenBalanceState,
  ValidatorsState
} from 'shared/snapshot/accountBalanceState'
import { GovernanceConfig } from 'shared/governance/config'
import { LSULP_RESOURCE_ADDRESS } from './dex/constants/assets'
import { buildLsuConverterMap, getLsuResourceAddresses } from './lsuConverter'
import { LsulpValue } from './dex/positions/caviarnine/lsulpValue'
import { CaviarNineShapePosition } from './dex/positions/caviarnine/shapePool'
import { OciswapPrecisionPosition } from './dex/positions/ociswap/precisionPool'
import { PoolUnitPosition } from './dex/positions/poolUnit'
import type { TokenFilterContext } from './dex/tokenFilter'
import type { PoolContribution } from './dex/types'

export type VotePowerSnapshotResult = {
  readonly votePower: R.ReadonlyRecord<AccountAddress, BigNumber>
  readonly breakdown: R.ReadonlyRecord<
    AccountAddress,
    readonly PoolContribution[]
  >
}

type PoolPositionResult = {
  totals: R.ReadonlyRecord<AccountAddress, BigNumber>
  breakdown: R.ReadonlyRecord<AccountAddress, readonly PoolContribution[]>
}

const emptyPoolResult: PoolPositionResult = {
  totals: R.empty(),
  breakdown: R.empty()
}

export class VotePowerSnapshot extends Effect.Service<VotePowerSnapshot>()(
  'VotePowerSnapshot',
  {
    dependencies: [
      AccountBalanceState.Default,
      GetFungibleBalance.Default,
      StateEntityDetails.Default,
      LsulpValue.Default,
      PoolUnitPosition.Default,
      OciswapPrecisionPosition.Default,
      CaviarNineShapePosition.Default
    ],
    effect: Effect.gen(function* () {
      const accountBalanceState = yield* AccountBalanceState
      const lsulpValueService = yield* LsulpValue
      const poolUnitPosition = yield* PoolUnitPosition
      const ociswapPrecisionPosition = yield* OciswapPrecisionPosition
      const caviarNineShapePosition = yield* CaviarNineShapePosition
      const stateEntityDetails = yield* StateEntityDetails
      const { xrdResourceAddress } = yield* GovernanceConfig
      const networkId = yield* Config.number('NETWORK_ID').pipe(
        Effect.orDie
      )
      const isMainnet = networkId === 1

      return Effect.fn('VotePowerSnapshot')(function* (input: {
        addresses: AccountAddress[]
        stateVersion: StateVersion
      }) {
        // 1. Fetch LSULP → XRD rate (mainnet only — address is hardcoded mainnet)
        const lsulpToXrdRate = isMainnet
          ? yield* lsulpValueService({
              stateVersion: input.stateVersion
            }).pipe(
              Effect.tap((result) =>
                Effect.log('VotePowerSnapshot LSULP rate', {
                  lsulpToXrdRate: result.lsulpToXrdRate.toFixed()
                })
              ),
              Effect.map((result) => result.lsulpToXrdRate),
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logWarning('Failed to fetch LSULP value', {
                    error
                  })
                  return new BigNumber(0)
                })
              )
            )
          : new BigNumber(0)

        const lsulpResourceAddress = FungibleResourceAddress.make(
          LSULP_RESOURCE_ADDRESS
        )

        // 2-7. Create shared state once and run all positions
        return yield* Effect.gen(function* () {
          // Build LSU converter map (ONE StateEntityDetails call)
          const lsuConverterMap = yield* buildLsuConverterMap(
            stateEntityDetails,
            input.stateVersion
          )

          yield* Effect.log('VotePowerSnapshot LSU converter map', {
            lsuCount: HashMap.size(lsuConverterMap)
          })

          const getFungibleTokenBalance =
            yield* AccountBalanceState.createGetFungibleTokenBalanceFn

          const validatorsState = yield* AccountBalanceState.validatorsState
          const lsuResourceAddresses = getLsuResourceAddresses(validatorsState)

          // XRD balance per account (no API call — reads from balance state)
          const computeXrd = (address: AccountAddress): BigNumber =>
            pipe(
              getFungibleTokenBalance(address, xrdResourceAddress),
              Option.match({
                onNone: () => new BigNumber(0),
                onSome: (amount) => new BigNumber(amount)
              })
            )

          // LSU balance per account (no API call — reads from balance state + converter)
          // Matches original LsuPosition rounding: decimalPlaces(2) per LSU resource
          const computeLsu = (address: AccountAddress): BigNumber =>
            pipe(
              lsuResourceAddresses,
              A.reduce(new BigNumber(0), (total, resourceAddress) =>
                pipe(
                  getFungibleTokenBalance(address, resourceAddress),
                  Option.flatMap((balance) =>
                    pipe(
                      HashMap.get(lsuConverterMap, resourceAddress),
                      Option.map((converter) =>
                        new BigNumber(converter(balance)).decimalPlaces(2)
                      )
                    )
                  ),
                  Option.match({
                    onNone: () => total,
                    onSome: (xrd) => total.plus(xrd)
                  })
                )
              )
            )

          // LSULP balance per account (mainnet only — reads from balance state)
          const computeLsulp = (address: AccountAddress): BigNumber => {
            if (!isMainnet) return new BigNumber(0)
            return pipe(
              getFungibleTokenBalance(address, lsulpResourceAddress),
              Option.match({
                onNone: () => new BigNumber(0),
                onSome: (amount) => lsulpToXrdRate.multipliedBy(amount)
              })
            )
          }

          // Pool positions in parallel (mainnet only — addresses are hardcoded mainnet)
          const tokenFilterCtx: TokenFilterContext = {
            lsuConverterMap,
            lsulpToXrdRate
          }

          const [poolUnitResult, precisionResult, shapeResult] = isMainnet
            ? yield* Effect.all(
                [
                  poolUnitPosition({
                    addresses: input.addresses,
                    stateVersion: input.stateVersion,
                    tokenFilterCtx
                  }).pipe(
                    Effect.catchAll((error) =>
                      Effect.gen(function* () {
                        yield* Effect.logWarning(
                          'Failed to compute pool unit positions',
                          { error }
                        )
                        return emptyPoolResult
                      })
                    )
                  ),
                  ociswapPrecisionPosition({
                    addresses: input.addresses,
                    stateVersion: input.stateVersion,
                    tokenFilterCtx
                  }).pipe(
                    Effect.catchAll((error) =>
                      Effect.gen(function* () {
                        yield* Effect.logWarning(
                          'Failed to compute Ociswap precision pool positions',
                          { error }
                        )
                        return emptyPoolResult
                      })
                    )
                  ),
                  caviarNineShapePosition({
                    addresses: input.addresses,
                    stateVersion: input.stateVersion,
                    tokenFilterCtx
                  }).pipe(
                    Effect.catchAll((error) =>
                      Effect.gen(function* () {
                        yield* Effect.logWarning(
                          'Failed to compute CaviarNine shape pool positions',
                          { error }
                        )
                        return emptyPoolResult
                      })
                    )
                  )
                ],
                { concurrency: 3 }
              ).pipe(
                Effect.tap(([pu, pr, sh]) =>
                  Effect.log('VotePowerSnapshot pool positions', {
                    accountsWithPoolUnitPositions: R.size(pu.totals),
                    accountsWithPrecisionPoolPositions: R.size(pr.totals),
                    accountsWithShapePoolPositions: R.size(sh.totals)
                  })
                )
              )
            : yield* Effect.log(
                'VotePowerSnapshot: skipping DEX positions (non-mainnet)'
              ).pipe(
                Effect.as(
                  [emptyPoolResult, emptyPoolResult, emptyPoolResult] as const
                )
              )

          // Merge all position types per account
          const allAccounts = pipe(
            [
              ...input.addresses,
              ...R.keys(poolUnitResult.totals),
              ...R.keys(precisionResult.totals),
              ...R.keys(shapeResult.totals)
            ],
            A.dedupe
          )

          const { votePower, breakdown } = pipe(
            allAccounts as AccountAddress[],
            A.reduce(
              {
                votePower: R.empty<AccountAddress, BigNumber>(),
                breakdown: R.empty<
                  AccountAddress,
                  readonly PoolContribution[]
                >()
              },
              (acc, address) => {
                const xrd = computeXrd(address)
                const lsu = computeLsu(address)
                const lsulp = computeLsulp(address)
                const simple = R.get(
                  poolUnitResult.totals,
                  address
                ).pipe(Option.getOrElse(() => new BigNumber(0)))
                const precision = R.get(
                  precisionResult.totals,
                  address
                ).pipe(Option.getOrElse(() => new BigNumber(0)))
                const shape = R.get(shapeResult.totals, address).pipe(
                  Option.getOrElse(() => new BigNumber(0))
                )

                const total = xrd
                  .plus(lsu)
                  .plus(lsulp)
                  .plus(simple)
                  .plus(precision)
                  .plus(shape)

                if (total.isZero()) return acc

                // Collect per-pool breakdown for diagnostics
                const accountBreakdown: PoolContribution[] = [
                  ...(lsulp.isZero()
                    ? []
                    : [
                        {
                          poolName: 'LSULP Direct',
                          poolType: 'lsulp' as const,
                          componentAddress: LSULP_RESOURCE_ADDRESS,
                          xrdValue: lsulp.toFixed()
                        }
                      ]),
                  ...R.get(poolUnitResult.breakdown, address).pipe(
                    Option.getOrElse(
                      (): readonly PoolContribution[] => []
                    )
                  ),
                  ...R.get(precisionResult.breakdown, address).pipe(
                    Option.getOrElse(
                      (): readonly PoolContribution[] => []
                    )
                  ),
                  ...R.get(shapeResult.breakdown, address).pipe(
                    Option.getOrElse(
                      (): readonly PoolContribution[] => []
                    )
                  )
                ]

                return {
                  votePower: R.set(acc.votePower, address, total),
                  breakdown:
                    accountBreakdown.length > 0
                      ? R.set(acc.breakdown, address, accountBreakdown)
                      : acc.breakdown
                }
              }
            )
          )

          yield* Effect.log('VotePowerSnapshot complete', {
            accountsWithVotePower: R.size(votePower)
          })

          return { votePower, breakdown } satisfies VotePowerSnapshotResult
        }).pipe(
          Effect.provideService(
            FungibleTokenBalanceState,
            yield* accountBalanceState.makeFungibleTokenBalanceState(input)
          ),
          Effect.provideService(
            ValidatorsState,
            yield* accountBalanceState.makeValidatorsState
          )
        )
      })
    })
  }
) {}
