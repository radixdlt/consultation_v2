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
import { Config, Effect, HashMap, Option, Record as R } from 'effect'
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
        let lsulpToXrdRate = new BigNumber(0)
        if (isMainnet) {
          const result = yield* lsulpValueService({
            stateVersion: input.stateVersion
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Effect.logWarning('Failed to fetch LSULP value', {
                  error
                })
                return { lsulpToXrdRate: new BigNumber(0) }
              })
            )
          )
          lsulpToXrdRate = result.lsulpToXrdRate

          yield* Effect.log('VotePowerSnapshot LSULP rate', {
            lsulpToXrdRate: lsulpToXrdRate.toFixed()
          })
        }

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
          const computeXrd = (address: AccountAddress): BigNumber => {
            const balance = getFungibleTokenBalance(
              address,
              xrdResourceAddress
            )
            return Option.match(balance, {
              onNone: () => new BigNumber(0),
              onSome: (amount) => new BigNumber(amount)
            })
          }

          // LSU balance per account (no API call — reads from balance state + converter)
          // Matches original LsuPosition rounding: decimalPlaces(2) per LSU resource
          const computeLsu = (address: AccountAddress): BigNumber => {
            let total = new BigNumber(0)
            for (const resourceAddress of lsuResourceAddresses) {
              const balance = getFungibleTokenBalance(
                address,
                resourceAddress
              )
              if (Option.isSome(balance)) {
                const converter = HashMap.get(
                  lsuConverterMap,
                  resourceAddress
                )
                if (Option.isSome(converter)) {
                  total = total.plus(
                    new BigNumber(converter.value(balance.value))
                      .decimalPlaces(2)
                  )
                }
              }
            }
            return total
          }

          // LSULP balance per account (mainnet only — reads from balance state)
          const computeLsulp = (address: AccountAddress): BigNumber => {
            if (!isMainnet) return new BigNumber(0)
            const balance = getFungibleTokenBalance(
              address,
              lsulpResourceAddress
            )
            return Option.match(balance, {
              onNone: () => new BigNumber(0),
              onSome: (amount) => lsulpToXrdRate.multipliedBy(amount)
            })
          }

          // Pool positions in parallel (mainnet only — addresses are hardcoded mainnet)
          let poolUnitResult = emptyPoolResult
          let precisionResult = emptyPoolResult
          let shapeResult = emptyPoolResult

          if (isMainnet) {
            const tokenFilterCtx: TokenFilterContext = {
              lsuConverterMap,
              lsulpToXrdRate
            }

            ;[poolUnitResult, precisionResult, shapeResult] =
              yield* Effect.all(
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
              )

            yield* Effect.log('VotePowerSnapshot pool positions', {
              accountsWithPoolUnitPositions: R.size(poolUnitResult.totals),
              accountsWithPrecisionPoolPositions: R.size(
                precisionResult.totals
              ),
              accountsWithShapePoolPositions: R.size(shapeResult.totals)
            })
          } else {
            yield* Effect.log(
              'VotePowerSnapshot: skipping DEX positions (non-mainnet)'
            )
          }

          // Merge all position types per account
          let votePower = R.empty<AccountAddress, BigNumber>()
          let breakdown = R.empty<
            AccountAddress,
            readonly PoolContribution[]
          >()

          const allAccounts = new Set([
            ...input.addresses,
            ...R.keys(poolUnitResult.totals),
            ...R.keys(precisionResult.totals),
            ...R.keys(shapeResult.totals)
          ])

          for (const address of allAccounts as Set<AccountAddress>) {
            const xrd = computeXrd(address)
            const lsu = computeLsu(address)
            const lsulp = computeLsulp(address)
            const simple = R.get(poolUnitResult.totals, address).pipe(
              Option.getOrElse(() => new BigNumber(0))
            )
            const precision = R.get(precisionResult.totals, address).pipe(
              Option.getOrElse(() => new BigNumber(0))
            )
            const shape = R.get(shapeResult.totals, address).pipe(
              Option.getOrElse(() => new BigNumber(0))
            )

            const total = xrd
              .plus(lsu)
              .plus(lsulp)
              .plus(simple)
              .plus(precision)
              .plus(shape)

            if (total.isZero()) continue

            votePower = R.set(votePower, address, total)

            // Collect per-pool breakdown for diagnostics
            const accountBreakdown: PoolContribution[] = []

            if (!lsulp.isZero()) {
              accountBreakdown.push({
                poolName: 'LSULP Direct',
                poolType: 'lsulp',
                componentAddress: LSULP_RESOURCE_ADDRESS,
                xrdValue: lsulp.toFixed()
              })
            }

            const poolUnitBreakdown = R.get(
              poolUnitResult.breakdown,
              address
            ).pipe(Option.getOrElse((): readonly PoolContribution[] => []))
            const precisionBreakdown = R.get(
              precisionResult.breakdown,
              address
            ).pipe(Option.getOrElse((): readonly PoolContribution[] => []))
            const shapeBreakdown = R.get(
              shapeResult.breakdown,
              address
            ).pipe(Option.getOrElse((): readonly PoolContribution[] => []))

            accountBreakdown.push(
              ...poolUnitBreakdown,
              ...precisionBreakdown,
              ...shapeBreakdown
            )

            if (accountBreakdown.length > 0) {
              breakdown = R.set(breakdown, address, accountBreakdown)
            }
          }

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
