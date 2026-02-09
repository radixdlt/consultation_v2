import { GatewayApiClient } from '@radix-effects/gateway'
import { Array as A, Effect, Option, Order, pipe, Ref, Stream } from 'effect'
import { Config } from 'shared/governance/config'
import { TransactionStreamConfig } from './config'

export class TransactionStreamService extends Effect.Service<TransactionStreamService>()(
  'TransactionStreamService',
  {
    effect: Effect.gen(function* () {
      const gatewayApiClient = yield* GatewayApiClient

      const currentStateVersion = yield* gatewayApiClient.status
        .getCurrent()
        .pipe(Effect.catchAll(Effect.die))
      yield* Effect.logDebug(currentStateVersion.ledger_state)

      return Stream.paginateEffect(1, () =>
        Effect.gen(function* () {
          const transactionStreamConfigRef = yield* TransactionStreamConfig
          const transactionStreamConfig =
            yield* transactionStreamConfigRef.pipe(Ref.get)
          const config = yield* Config

          const stateVersion = yield* transactionStreamConfig.stateVersion.pipe(
            Option.match({
              onNone: () =>
                gatewayApiClient.status.getCurrent().pipe(
                  Effect.map((res) => res.ledger_state.state_version),
                  Effect.catchAll(Effect.die)
                ),
              onSome: (version) => Effect.succeed(version)
            })
          )

          yield* Effect.logDebug(
            `fetching transactions from state version ${stateVersion}`
          )

          const result = yield* gatewayApiClient.stream.innerClient
            .streamTransactions({
              streamTransactionsRequest: {
                limit_per_page: transactionStreamConfig.limitPerPage,
                from_ledger_state: {
                  state_version: stateVersion
                },
                order: 'Asc',
                kind_filter: 'User',
                opt_ins: transactionStreamConfig.optIns,
                affected_global_entities_filter: [config.componentAddress]
              }
            })
            .pipe(
              Effect.catchTags({
                AccountLockerNotFoundError: Effect.die,
                EntityNotFoundError: Effect.die,
                ErrorResponse: Effect.die,
                InvalidEntityError: Effect.die,
                InvalidTransactionError: Effect.die,
                ResponseError: Effect.die,
                TransactionNotFoundError: Effect.die
              })
            )

          yield* Effect.logDebug(`fetched ${result.items.length} transactions`)

          const sortedItems = pipe(
            result.items,
            A.sortBy(Order.mapInput(Order.number, (tx) => tx.state_version))
          )

          const firstItem = pipe(sortedItems, A.head)

          const lastItem = pipe(sortedItems, A.last)

          yield* Option.all([firstItem, lastItem]).pipe(
            Option.match({
              onNone: () => Effect.void,
              onSome: ([first, last]) =>
                Effect.log(
                  `${first.round_timestamp} -> ${last.round_timestamp}`
                )
            })
          )

          const nextStateVersion = lastItem.pipe(
            Option.map((res) => res.state_version + 1),
            Option.getOrElse(() => stateVersion)
          )

          yield* Ref.update(transactionStreamConfigRef, (config) => {
            return {
              ...config,
              stateVersion: Option.some(nextStateVersion)
            }
          })

          if (nextStateVersion === stateVersion) {
            yield* Effect.logDebug('Waiting for new transactions...')
            yield* Effect.sleep(transactionStreamConfig.waitTime)
            return [[], Option.some(stateVersion)]
          }

          return [result.items, Option.some(nextStateVersion)]
        })
      ).pipe(Stream.filter((item) => item.length > 0))
    })
  }
) {}
