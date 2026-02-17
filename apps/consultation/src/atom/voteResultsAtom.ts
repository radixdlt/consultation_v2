import { Atom } from '@effect-atom/atom-react'
import { Effect } from 'effect'
import { type EntityId, type EntityType } from 'shared/governance/brandedTypes'
import { VoteClient, voteClientRuntime } from '@/atom/voteClient'

export const voteResultsAtom = Atom.family((type: EntityType) =>
  Atom.family((entityId: EntityId) =>
    voteClientRuntime.atom(
      Effect.gen(function* () {
        const client = yield* VoteClient
        const { results } = yield* client.GetVoteResults({ type, entityId })
        return results
      })
    )
  )
)
