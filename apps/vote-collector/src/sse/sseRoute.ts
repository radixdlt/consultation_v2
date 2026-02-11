import { HttpLayerRouter, HttpServerResponse } from '@effect/platform'
import { Effect, Layer, Schedule, Stream } from 'effect'
import { VoteUpdatePubSub } from './voteUpdatePubSub'

const encoder = new TextEncoder()

export const SseRouteLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const router = yield* HttpLayerRouter.HttpRouter
    const pubsub = yield* VoteUpdatePubSub

    yield* router.add('GET', '/events', () =>
      Effect.gen(function* () {
        const events = Stream.fromPubSub(pubsub).pipe(
          Stream.map(
            (event) =>
              `event: vote-update\ndata: ${JSON.stringify({ type: event.type, entityId: event.entityId })}\n\n`
          )
        )

        const heartbeat = Stream.schedule(
          Stream.make(': keepalive\n\n'),
          Schedule.spaced('30 seconds')
        )

        const merged = Stream.merge(events, heartbeat).pipe(
          Stream.map((chunk) => encoder.encode(chunk))
        )

        return HttpServerResponse.stream(merged, {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive'
          }
        })
      })
    )
  })
)
