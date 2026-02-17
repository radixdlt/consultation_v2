import { GatewayApiClient } from '@radix-effects/gateway'
import { StateVersion } from '@radix-effects/shared'
import { Array as A, Effect, Order, Option, pipe } from 'effect'
import { GovernanceConfig } from 'shared/governance/config'
import { LedgerCursor } from './ledgerCursor'
import { GovernanceEventProcessor } from './governanceEvents'
import type { VoteCalculationPayload } from './vote-calculation/types'
import { VoteCalculation } from './vote-calculation/voteCalculation'

type Payload = typeof VoteCalculationPayload.Type
type EntityKey = `${Payload['type']}-${number}`

const makeKey = (p: Payload): EntityKey => `${p.type}-${p.entityId}`

const PAGE_SIZE = 100

export class PollService extends Effect.Service<PollService>()('PollService', {
  dependencies: [
    LedgerCursor.Default,
    GovernanceEventProcessor.Default,
    VoteCalculation.Default
  ],
  effect: Effect.gen(function* () {
    const cursor = yield* LedgerCursor
    const gateway = yield* GatewayApiClient
    const { processBatch } = yield* GovernanceEventProcessor
    const calculateVotes = yield* VoteCalculation
    const config = yield* GovernanceConfig

    const fetchPage = (stateVersion: StateVersion) =>
      gateway.stream.innerClient
        .streamTransactions({
          streamTransactionsRequest: {
            limit_per_page: PAGE_SIZE,
            from_ledger_state: { state_version: stateVersion },
            order: 'Asc',
            kind_filter: 'User',
            opt_ins: {
              affected_global_entities: true,
              detailed_events: true
            },
            affected_global_entities_filter: [config.componentAddress]
          }
        })
        .pipe(Effect.orDie)

    const processPage = (stateVersion: StateVersion) =>
      Effect.gen(function* () {
        const result = yield* fetchPage(stateVersion)

        if (A.isEmptyArray(result.items)) {
          yield* Effect.log('No transactions to process, poll complete')
          return { stateVersion, drained: true }
        }

        const sorted = A.sortWith(
          result.items,
          (tx) => tx.state_version,
          Order.number
        )
        const maxSv = pipe(
          sorted,
          A.last,
          Option.map((tx) => StateVersion.make(tx.state_version)),
          Option.getOrThrow
        )

        yield* Effect.log('Processing transaction batch', {
          count: sorted.length,
          fromSv: stateVersion,
          toSv: maxSv
        })

        const payloads = yield* processBatch(sorted)

        if (A.isNonEmptyArray(payloads)) {
          const deduped = A.dedupeWith(
            A.reverse(payloads),
            (a, b) => makeKey(a) === makeKey(b)
          )

          yield* Effect.log('Calculating votes', {
            entities: deduped.length
          })

          yield* Effect.forEach(
            deduped,
            (payload) =>
              calculateVotes(payload).pipe(
                Effect.tap(() => Effect.log('Vote calculation complete')),
                Effect.annotateLogs({
                  type: payload.type,
                  entityId: payload.entityId
                })
              ),
            { concurrency: 5 }
          )
        }

        const nextSv = StateVersion.make(maxSv + 1)
        yield* cursor.advance(nextSv)

        return {
          stateVersion: nextSv,
          drained: result.items.length < PAGE_SIZE
        }
      })

    return Effect.fn('@VoteCollector/PollService')(function* () {
      const sv = yield* cursor.getOrBootstrap()

      yield* Effect.log('Poll started', { fromStateVersion: sv })

      yield* Effect.iterate(
        { stateVersion: sv, drained: false },
        {
          while: (s) => !s.drained,
          body: (s) => processPage(s.stateVersion)
        }
      )
    })
  })
}) {}
