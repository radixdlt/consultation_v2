import { Effect, PubSub } from 'effect'
import type { VoteUpdateEvent } from 'shared/rpc/voteUpdateEvent'

export class VoteUpdatePubSub extends Effect.Service<VoteUpdatePubSub>()(
  'VoteUpdatePubSub',
  {
    effect: PubSub.unbounded<VoteUpdateEvent>()
  }
) {}
