/**
 * Fetch CaviarNine QuantaSwap bin map data from a Key-Value Store.
 *
 * Adapted from radix-incentives getQuantaSwapBinMap.ts.
 * Uses GetKeyValueStoreService from @radix-effects/gateway.
 */

import { GetKeyValueStoreService } from '@radix-effects/gateway'
import type { AtLedgerState } from '@radix-effects/gateway'
import { Data, Effect } from 'effect'
import s from 'sbor-ez-mode'
import { I192 } from './i192'

class FailedToParseComponentStateError extends Data.TaggedError(
  'FailedToParseComponentStateError'
)<{ message: string }> {}

const binMapKeySchema = s.tuple([s.number()])
const binMapValueSchema = s.struct({
  amount: s.decimal(),
  total_claim: s.decimal()
})

export type BinMapData = Map<number, { amount: I192; total_claim: I192 }>

export class GetQuantaSwapBinMap extends Effect.Service<GetQuantaSwapBinMap>()(
  'GetQuantaSwapBinMap',
  {
    dependencies: [GetKeyValueStoreService.Default],
    effect: Effect.gen(function* () {
      const getKeyValueStore = yield* GetKeyValueStoreService

      return Effect.fn('GetQuantaSwapBinMap')(function* (input: {
        address: string
        at_ledger_state: AtLedgerState
      }) {
        const keyValueStore = yield* getKeyValueStore({
          address: input.address,
          at_ledger_state: input.at_ledger_state
        })

        const binData = yield* Effect.forEach(
          keyValueStore.entries,
          (entry) =>
            Effect.gen(function* () {
              const parsedKey = binMapKeySchema.safeParse(
                entry.key.programmatic_json
              )
              const parsedValue = binMapValueSchema.safeParse(
                entry.value.programmatic_json
              )

              if (parsedKey.isErr()) {
                return yield* new FailedToParseComponentStateError({
                  message: `Failed to parse bin map key: ${parsedKey.error.message}`
                })
              }

              if (parsedValue.isErr()) {
                return yield* new FailedToParseComponentStateError({
                  message: `Failed to parse bin map value: ${parsedValue.error.message}`
                })
              }

              return {
                key: parsedKey.value[0],
                value: parsedValue.value
              }
            })
        ).pipe(
          Effect.map((items) =>
            items.reduce<BinMapData>((acc, { key, value }) => {
              acc.set(key, {
                amount: new I192(value.amount),
                total_claim: new I192(value.total_claim)
              })
              return acc
            }, new Map())
          )
        )

        return binData
      })
    })
  }
) {}
