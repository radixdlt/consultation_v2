import { Effect, PubSub, Schema } from 'effect'
import { VoteUpdateEvent } from 'shared/rpc/voteUpdateEvent'
import { envVars } from './envVars'

export class VoteEventSource extends Effect.Service<VoteEventSource>()(
  'VoteEventSource',
  {
    scoped: Effect.gen(function* () {
      const changes = yield* PubSub.unbounded<VoteUpdateEvent>()
      const reconnected = yield* PubSub.unbounded<void>()
      const decode = Schema.decodeUnknownSync(VoteUpdateEvent)

      let hasConnected = false

      const es = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const source = new EventSource(
            `${envVars.VOTE_COLLECTOR_URL}/events`
          )

          source.addEventListener('vote-update', (e) => {
            try {
              const event = decode(JSON.parse(e.data))
              Effect.runSync(PubSub.publish(changes, event))
            } catch {
              // ignore malformed events
            }
          })

          source.addEventListener('open', () => {
            if (hasConnected) {
              Effect.runSync(PubSub.publish(reconnected, void 0))
            }
            hasConnected = true
          })

          return source
        }),
        (source) => Effect.sync(() => source.close())
      )

      yield* Effect.log('VoteEventSource connected', envVars.VOTE_COLLECTOR_URL)

      return { changes, reconnected, eventSource: es }
    })
  }
) {}
