import { Atom } from '@effect-atom/atom-react'
import { Effect, Stream } from 'effect'
import { type EntityId, type EntityType } from 'shared/governance/brandedTypes'
import { accountVotesAtom } from '@/atom/accountVotesAtom'
import { VoteClient, voteClientRuntime } from '@/atom/voteClient'
import { VoteEventSource } from '@/lib/voteEventSource'

export const isCalculatingAtom = Atom.family((_type: EntityType) =>
  Atom.family((_entityId: EntityId) => Atom.make(false))
)

export const voteResultsAtom = Atom.family((type: EntityType) =>
  Atom.family((entityId: EntityId) =>
    voteClientRuntime.atom(
      Effect.fnUntraced(function* (get) {
        const client = yield* VoteClient
        const { results, isCalculating } = yield* client.GetVoteResults({
          type,
          entityId
        })
        get.set(isCalculatingAtom(type)(entityId), isCalculating)
        return results
      })
    )
  )
)

export const voteUpdatesAtom = Atom.family((type: EntityType) =>
  Atom.family((entityId: EntityId) =>
    voteClientRuntime.atom(
      Effect.fnUntraced(function* (get) {
        const { changes, reconnected } = yield* VoteEventSource

        const voteUpdates = Stream.fromPubSub(changes).pipe(
          Stream.filter((e) => e.type === type && e.entityId === entityId)
        )
        const reconnections = Stream.fromPubSub(reconnected).pipe(
          Stream.map(() => ({ type, entityId, isCalculating: false }) as const)
        )

        yield* Stream.merge(voteUpdates, reconnections).pipe(
          Stream.runForEach((event) =>
            Effect.sync(() => {
              get.set(isCalculatingAtom(type)(entityId), event.isCalculating)
              if (!event.isCalculating) {
                get.refresh(voteResultsAtom(type)(entityId))
                get.refresh(accountVotesAtom(type)(entityId))
              }
            })
          )
        )
      })
    )
  )
)
