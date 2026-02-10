import { Atom } from '@effect-atom/atom-react'
import { Effect } from 'effect'
import { EntityId, type EntityType } from 'shared/governance/brandedTypes'
import { VoteClient, voteClientRuntime } from '@/atom/voteClient'

export const accountVotesAtom = Atom.family((type: EntityType) =>
  Atom.family((entityId: number) =>
    voteClientRuntime.atom(
      Effect.gen(function* () {
        const client = yield* VoteClient
        return yield* client.GetAccountVotes({
          type,
          entityId: EntityId.make(entityId)
        })
      })
    )
  )
)
