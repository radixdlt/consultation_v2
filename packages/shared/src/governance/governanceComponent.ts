import {
  GetComponentStateService,
  GetKeyValueStoreService,
  GetLedgerStateService,
  KeyValueStoreDataService,
  StateEntityDetails
} from '@radix-effects/gateway'
import {
  AccountAddress,
  StateVersion,
  TransactionManifestString
} from '@radix-effects/shared'
import type { StateKeyValueStoreDataResponseItem } from '@radixdlt/babylon-gateway-api-sdk'
import { Array as A, Data, Effect, Option, pipe, Schema } from 'effect'
import { parseSbor } from '../helpers/parseSbor'
import {
  Governance,
  KeyValueStoreAddress,
  ProposalKeyValueStoreValue,
  TemperatureCheckKeyValueStoreKey,
  TemperatureCheckKeyValueStoreValue,
  TemperatureCheckVoteKeyValueStoreKey,
  TemperatureCheckVoteKeyValueStoreValue
} from '../schemas'
import type { ProposalId, TemperatureCheckId } from './brandedTypes'
import { Config } from './config'
import {
  type MakeTemperatureCheckInput,
  MakeTemperatureCheckInputSchema,
  type MakeTemperatureCheckVoteInput,
  MakeTemperatureCheckVoteInputSchema,
  ProposalSchema,
  TemperatureCheckSchema,
  TemperatureCheckVoteSchema,
  TemperatureCheckVoteValueSchema
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

class TemperatureCheckNotFoundError extends Data.TaggedError(
  'TemperatureCheckNotFoundError'
)<{
  message: string
}> {}

class ProposalNotFoundError extends Data.TaggedError('ProposalNotFoundError')<{
  message: string
}> {}

export class GovernanceComponent extends Effect.Service<GovernanceComponent>()(
  'GovernanceComponent',
  {
    dependencies: [
      GetKeyValueStoreService.Default,
      StateEntityDetails.Default,
      GetComponentStateService.Default,
      GetLedgerStateService.Default,
      KeyValueStoreDataService.Default
    ],
    effect: Effect.gen(function* () {
      const keyValueStore = yield* GetKeyValueStoreService
      const keyValueStoreDataService = yield* KeyValueStoreDataService
      const ledgerState = yield* GetLedgerStateService

      const getComponentStateService = yield* GetComponentStateService
      const config = yield* Config

      const getStateVersion = () =>
        ledgerState({
          at_ledger_state: {
            timestamp: new Date()
          }
        }).pipe(Effect.map((result) => StateVersion.make(result.state_version)))

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

      const getTemperatureCheckById = (id: TemperatureCheckId) =>
        Effect.gen(function* () {
          const stateVersion = yield* getStateVersion()

          const keyValueStoreAddress = yield* getComponentState(
            stateVersion
          ).pipe(
            Effect.map((result) =>
              KeyValueStoreAddress.make(result.temperature_checks)
            )
          )

          const temperatureCheck = yield* keyValueStoreDataService({
            at_ledger_state: {
              state_version: stateVersion
            },
            key_value_store_address: keyValueStoreAddress,
            keys: [
              {
                key_json: { kind: 'U64' as const, value: id.toString() }
              }
            ]
          }).pipe(
            Effect.map((result) =>
              pipe(
                result,
                A.head,
                Option.flatMap((item) => A.head(item.entries)),
                Option.flatMap((item) =>
                  Option.fromNullable(item.value.programmatic_json)
                ),
                Option.getOrThrowWith(
                  () =>
                    new TemperatureCheckNotFoundError({
                      message: 'Temperature check not found'
                    })
                )
              )
            ),
            Effect.flatMap((sbor) => {
              return parseSbor(sbor, TemperatureCheckKeyValueStoreValue)
            }),
            Effect.flatMap((parsed) => {
              return Schema.decodeUnknown(TemperatureCheckSchema)({
                ...parsed,
                id
              })
            })
          )

          return temperatureCheck
        })

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

          const links = parsedInput.links.map((url) => `"${url}"`).join(', ')

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

      const makeTemperatureCheckVoteManifest = (
        input: MakeTemperatureCheckVoteInput
      ) =>
        Effect.gen(function* () {
          const parsedInput = yield* Schema.decodeUnknown(
            MakeTemperatureCheckVoteInputSchema
          )(input)

          return TransactionManifestString.make(`   
            CALL_METHOD
              Address("${config.componentAddress}")
              "vote_on_temperature_check"
              Address("${parsedInput.accountAddress}") # account to vote with
              ${parsedInput.temperatureCheckId}u64 # temperature check id
              Enum<${parsedInput.vote === 'For' ? 0 : 1}u8>() # for or against temp check, this is "for", Enum<1u8>() would be "against"
            ;
    
            CALL_METHOD
              Address("${parsedInput.accountAddress}")
              "deposit_batch"
              Expression("ENTIRE_WORKTOP")
            ;
          `)
        })

const getTemperatureCheckVotesByAccounts = (input: {
        keyValueStoreAddress: KeyValueStoreAddress
        accounts: AccountAddress[]
      }) =>
        Effect.gen(function* () {
          const stateVersion = yield* getStateVersion()

          const AccountAddressSchema = Schema.Struct({ value: AccountAddress })

          return yield* keyValueStoreDataService({
            at_ledger_state: {
              state_version: stateVersion
            },
            key_value_store_address: input.keyValueStoreAddress,
            keys: input.accounts.map((address) => ({
              key_json: { kind: 'Reference' as const, value: address }
            }))
          }).pipe(
            Effect.map((result) =>
              pipe(
                result,
                A.head,
                Option.map((item) => item.entries),
                Option.getOrElse(() =>
                  A.empty<StateKeyValueStoreDataResponseItem>()
                )
              )
            ),
            Effect.flatMap(
              Effect.forEach(
                Effect.fnUntraced(function* (item) {
                  const address = yield* Schema.decodeUnknown(
                    AccountAddressSchema
                  )(item.key.programmatic_json).pipe(
                    Effect.map((result) => result.value)
                  )

                  const vote = yield* Schema.decodeUnknown(
                    TemperatureCheckVoteValueSchema
                  )(item.value.programmatic_json)

                  return {
                    address,
                    vote
                  }
                })
              )
            )
          )
        })

      const getGovernanceState = () =>
        Effect.gen(function* () {
          const stateVersion = yield* getStateVersion()
          const componentState = yield* getComponentState(stateVersion)
          return {
            stateVersion,
            temperatureCheckCount: componentState.temperature_check_count,
            proposalCount: componentState.proposal_count,
            temperatureChecksKvs: KeyValueStoreAddress.make(
              componentState.temperature_checks
            ),
            proposalsKvs: KeyValueStoreAddress.make(componentState.proposals)
          }
        })

      const getProposalById = (id: ProposalId) =>
        Effect.gen(function* () {
          const stateVersion = yield* getStateVersion()

          const keyValueStoreAddress = yield* getComponentState(
            stateVersion
          ).pipe(
            Effect.map((result) => KeyValueStoreAddress.make(result.proposals))
          )

          const proposal = yield* keyValueStoreDataService({
            at_ledger_state: {
              state_version: stateVersion
            },
            key_value_store_address: keyValueStoreAddress,
            keys: [
              {
                key_json: { kind: 'U64' as const, value: id.toString() }
              }
            ]
          }).pipe(
            Effect.map((result) =>
              pipe(
                result,
                A.head,
                Option.flatMap((item) =>
                  Option.fromNullable(item.entries[0]?.value.programmatic_json)
                ),
                Option.getOrThrowWith(
                  () =>
                    new ProposalNotFoundError({
                      message: 'Proposal not found'
                    })
                )
              )
            ),
            Effect.flatMap((sbor) => {
              return parseSbor(sbor, ProposalKeyValueStoreValue)
            }),
            Effect.flatMap((parsed) => {
              return Schema.decodeUnknown(ProposalSchema)({
                ...parsed,
                id
              })
            })
          )

          return proposal
        })

      const getPaginatedTemperatureChecks = (input: {
        page: number
        pageSize: number
        sortOrder?: 'asc' | 'desc'
      }) =>
        Effect.gen(function* () {
          const { stateVersion, temperatureCheckCount, temperatureChecksKvs } =
            yield* getGovernanceState()

          const sortOrder = input.sortOrder ?? 'desc'

          // Calculate which IDs to fetch based on sort order
          // IDs are 0-indexed: if count is 10, IDs are 0-9
          let startId: number
          let endId: number
          let ids: number[]

          if (sortOrder === 'desc') {
            // Newest first (highest ID first)
            startId = temperatureCheckCount - 1 - (input.page - 1) * input.pageSize
            endId = Math.max(startId - input.pageSize + 1, 0)

            if (startId < 0) {
              return {
                items: [],
                totalCount: temperatureCheckCount,
                page: input.page,
                pageSize: input.pageSize,
                totalPages: Math.ceil(temperatureCheckCount / input.pageSize)
              }
            }

            ids = A.makeBy(startId - endId + 1, (i) => startId - i)
          } else {
            // Oldest first (lowest ID first)
            startId = (input.page - 1) * input.pageSize
            endId = Math.min(startId + input.pageSize - 1, temperatureCheckCount - 1)

            if (startId >= temperatureCheckCount) {
              return {
                items: [],
                totalCount: temperatureCheckCount,
                page: input.page,
                pageSize: input.pageSize,
                totalPages: Math.ceil(temperatureCheckCount / input.pageSize)
              }
            }

            ids = A.makeBy(endId - startId + 1, (i) => startId + i)
          }

          const keys = ids.map((id) => ({
            key_json: { kind: 'U64' as const, value: id.toString() }
          }))

          const items = yield* keyValueStoreDataService({
            at_ledger_state: {
              state_version: stateVersion
            },
            key_value_store_address: temperatureChecksKvs,
            keys
          }).pipe(
            Effect.map((result) =>
              pipe(
                result,
                A.head,
                Option.map((item) => item.entries),
                Option.getOrElse(() => [])
              )
            ),
            Effect.flatMap((entries) =>
              Effect.all(
                entries.map((entry, index) =>
                  pipe(
                    Option.fromNullable(entry.value.programmatic_json),
                    Option.match({
                      onNone: () => Effect.succeed(Option.none()),
                      onSome: (sbor) =>
                        parseSbor(sbor, TemperatureCheckKeyValueStoreValue).pipe(
                          Effect.flatMap((parsed) =>
                            Schema.decodeUnknown(TemperatureCheckSchema)({
                              ...parsed,
                              id: ids[index]
                            })
                          ),
                          Effect.map(Option.some)
                        )
                    })
                  )
                ),
                { concurrency: 'unbounded' }
              )
            ),
            Effect.map(A.filterMap((x) => x))
          )

          return {
            items,
            totalCount: temperatureCheckCount,
            page: input.page,
            pageSize: input.pageSize,
            totalPages: Math.ceil(temperatureCheckCount / input.pageSize)
          }
        })

      const getPaginatedProposals = (input: {
        page: number
        pageSize: number
        sortOrder?: 'asc' | 'desc'
      }) =>
        Effect.gen(function* () {
          const { stateVersion, proposalCount, proposalsKvs } =
            yield* getGovernanceState()

          const sortOrder = input.sortOrder ?? 'desc'

          // Calculate which IDs to fetch based on sort order
          let startId: number
          let endId: number
          let ids: number[]

          if (sortOrder === 'desc') {
            // Newest first (highest ID first)
            startId = proposalCount - 1 - (input.page - 1) * input.pageSize
            endId = Math.max(startId - input.pageSize + 1, 0)

            if (startId < 0) {
              return {
                items: [],
                totalCount: proposalCount,
                page: input.page,
                pageSize: input.pageSize,
                totalPages: Math.ceil(proposalCount / input.pageSize)
              }
            }

            ids = A.makeBy(startId - endId + 1, (i) => startId - i)
          } else {
            // Oldest first (lowest ID first)
            startId = (input.page - 1) * input.pageSize
            endId = Math.min(startId + input.pageSize - 1, proposalCount - 1)

            if (startId >= proposalCount) {
              return {
                items: [],
                totalCount: proposalCount,
                page: input.page,
                pageSize: input.pageSize,
                totalPages: Math.ceil(proposalCount / input.pageSize)
              }
            }

            ids = A.makeBy(endId - startId + 1, (i) => startId + i)
          }

          const keys = ids.map((id) => ({
            key_json: { kind: 'U64' as const, value: id.toString() }
          }))

          const items = yield* keyValueStoreDataService({
            at_ledger_state: {
              state_version: stateVersion
            },
            key_value_store_address: proposalsKvs,
            keys
          }).pipe(
            Effect.map((result) =>
              pipe(
                result,
                A.head,
                Option.map((item) => item.entries),
                Option.getOrElse(() => [])
              )
            ),
            Effect.flatMap((entries) =>
              Effect.all(
                entries.map((entry, index) =>
                  pipe(
                    Option.fromNullable(entry.value.programmatic_json),
                    Option.match({
                      onNone: () => Effect.succeed(Option.none()),
                      onSome: (sbor) =>
                        parseSbor(sbor, ProposalKeyValueStoreValue).pipe(
                          Effect.flatMap((parsed) =>
                            Schema.decodeUnknown(ProposalSchema)({
                              ...parsed,
                              id: ids[index]
                            })
                          ),
                          Effect.map(Option.some)
                        )
                    })
                  )
                ),
                { concurrency: 'unbounded' }
              )
            ),
            Effect.map(A.filterMap((x) => x))
          )

          return {
            items,
            totalCount: proposalCount,
            page: input.page,
            pageSize: input.pageSize,
            totalPages: Math.ceil(proposalCount / input.pageSize)
          }
        })

      return {
        getTemperatureChecks,
        getTemperatureChecksVotes,
        makeTemperatureCheckManifest,
        getTemperatureCheckById,
        makeTemperatureCheckVoteManifest,
        getTemperatureCheckVotesByAccounts,
        getGovernanceState,
        getProposalById,
        getPaginatedTemperatureChecks,
        getPaginatedProposals
      }
    })
  }
) {}
