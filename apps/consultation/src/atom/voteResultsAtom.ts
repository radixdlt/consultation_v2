import { Atom } from '@effect-atom/atom-react'
import { Effect, Stream } from 'effect'
import { type EntityId, type EntityType } from 'shared/governance/brandedTypes'
import { VoteClient, voteClientRuntime } from '@/atom/voteClient'
import { VoteEventSource } from '@/lib/voteEventSource'

export const voteResultsAtom = Atom.family((type: EntityType) =>
  Atom.family((entityId: EntityId) =>
    voteClientRuntime.atom(
      Effect.gen(function* () {
        const client = yield* VoteClient
        return yield* client.GetVoteResults({
          type,
          entityId
        })
      })
    )
  )
)

export const voteUpdatesAtom = Atom.family((type: EntityType) =>
  Atom.family((entityId: EntityId) =>
    voteClientRuntime
      .atom(
        Effect.fnUntraced(function* (get) {
          const { changes, reconnected } = yield* VoteEventSource

          const voteUpdates = Stream.fromPubSub(changes).pipe(
            Stream.filter((e) => e.type === type && e.entityId === entityId),
            Stream.map(() => 'change' as const)
          )
          const reconnections = Stream.fromPubSub(reconnected).pipe(
            Stream.map(() => 'reconnect' as const)
          )

          yield* Stream.merge(voteUpdates, reconnections).pipe(
            Stream.runForEach(() =>
              Effect.sync(() => get.refresh(voteResultsAtom(type)(entityId)))
            )
          )
        })
      )
  )
)
