import {
  GetComponentStateService,
  GetKeyValueStoreService,
  StateEntityDetails
} from '@radix-effects/gateway'
import {
  type StateVersion,
  TransactionManifestString
} from '@radix-effects/shared'
import { Array as A, Data, Effect, Option, pipe, Schema } from 'effect'
import { parseSbor } from '../helpers/parseSbor'
import {
  Governance,
  type KeyValueStoreAddress,
  TemperatureCheckKeyValueStoreKey,
  TemperatureCheckKeyValueStoreValue,
  TemperatureCheckVoteKeyValueStoreKey,
  TemperatureCheckVoteKeyValueStoreValue
} from '../schemas'
import { Config } from './config'
import {
  type MakeTemperatureCheckInput,
  MakeTemperatureCheckInputSchema,
  TemperatureCheckSchema,
  TemperatureCheckVoteSchema
} from './schemas'

export class KeyValueStoreNotFoundError extends Data.TaggedError(
  'KeyValueStoreNotFoundError'
)<{
  message: string
}> {}

class ComponentStateNotFoundError extends Data.TaggedError(
  'ComponentStateNotFoundError'
)<{
  message: string
}> {}

export class GovernanceComponent extends Effect.Service<GovernanceComponent>()(
  'GovernanceComponent',
  {
    dependencies: [
      GetKeyValueStoreService.Default,
      StateEntityDetails.Default,
      GetComponentStateService.Default
    ],
    effect: Effect.gen(function* () {
      const keyValueStore = yield* GetKeyValueStoreService

      const getComponentStateService = yield* GetComponentStateService
      const config = yield* Config

      const getComponentState = (stateVersion: StateVersion) =>
        getComponentStateService
          .run({
            addresses: [config.componentAddress],
            at_ledger_state: {
              state_version: stateVersion
            },
            schema: Governance
          })
          .pipe(
            Effect.map((result) =>
              pipe(
                result,
                A.head,
                Option.map((item) => item.state),
                Option.getOrThrowWith(
                  () =>
                    new ComponentStateNotFoundError({
                      message: 'Component state not found'
                    })
                )
              )
            )
          )

      const getTemperatureChecks = (stateVersion: StateVersion) =>
        getComponentState(stateVersion).pipe(
          Effect.flatMap((componentState) =>
            keyValueStore({
              at_ledger_state: {
                state_version: stateVersion
              },
              address: componentState.temperature_checks
            })
          ),
          Effect.map((result) =>
            pipe(
              result.entries,
              A.map((entry) =>
                Effect.all(
                  [
                    parseSbor(
                      entry.key.programmatic_json,
                      TemperatureCheckKeyValueStoreKey
                    ),
                    parseSbor(
                      entry.value.programmatic_json,
                      TemperatureCheckKeyValueStoreValue
                    )
                  ],
                  { concurrency: 2 }
                ).pipe(
                  Effect.flatMap(([key, value]) =>
                    Schema.decodeUnknownEither(TemperatureCheckSchema)({
                      id: key,
                      ...value
                    })
                  )
                )
              )
            )
          ),
          Effect.flatMap(Effect.all)
        )

      const getTemperatureChecksVotes = (input: {
        stateVersion: StateVersion
        keyValueStoreAddress: KeyValueStoreAddress
      }) =>
        keyValueStore({
          at_ledger_state: {
            state_version: input.stateVersion
          },
          address: input.keyValueStoreAddress
        }).pipe(
          Effect.map((result) =>
            pipe(
              result.entries,
              A.map((entry) =>
                Effect.all(
                  [
                    parseSbor(
                      entry.key.programmatic_json,
                      TemperatureCheckVoteKeyValueStoreKey
                    ),
                    parseSbor(
                      entry.value.programmatic_json,
                      TemperatureCheckVoteKeyValueStoreValue
                    )
                  ],
                  { concurrency: 2 }
                ).pipe(
                  Effect.flatMap(([key, value]) =>
                    Schema.decodeUnknownEither(TemperatureCheckVoteSchema)({
                      id: key,
                      voter: value.voter,
                      vote: value.vote
                    })
                  )
                )
              )
            )
          ),
          Effect.flatMap(Effect.all)
        )

      const makeTemperatureCheckManifest = (input: MakeTemperatureCheckInput) =>
        Effect.gen(function* () {
          const parsedInput = yield* Schema.decodeUnknown(
            MakeTemperatureCheckInputSchema
          )(input)

          const voteOptions = parsedInput.voteOptions
            .map((option) => `Tuple("${option}")`)
            .join(', ')

          const links = parsedInput.links
            .map((url) => `"${url}"`)
            .join(', ')

          const maxSelectionsManifest =
            parsedInput.maxSelections === 1
              ? 'Enum<0u8>()'
              : `Enum<1u8>(${parsedInput.maxSelections}u32)`

          return TransactionManifestString.make(`
CALL_METHOD
  Address("${config.componentAddress}")
  "make_temperature_check"
  Address("${parsedInput.authorAccount}")
  Tuple(
    "${parsedInput.title}",
    "${parsedInput.shortDescription}",
    ${JSON.stringify(parsedInput.description)},
    Array<Tuple>(${voteOptions}),
    Array<String>(${links}),
    ${maxSelectionsManifest}
  )
;
CALL_METHOD
  Address("${parsedInput.authorAccount}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
          `)
        })

      return {
        getTemperatureChecks,
        getTemperatureChecksVotes,
        makeTemperatureCheckManifest
      }
    })
  }
) {}
