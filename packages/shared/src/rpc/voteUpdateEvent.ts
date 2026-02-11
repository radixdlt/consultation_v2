import { Schema } from 'effect'
import { EntityId, EntityType } from '../governance/brandedTypes'

export class VoteUpdateEvent extends Schema.Class<VoteUpdateEvent>(
  'VoteUpdateEvent'
)({
  type: EntityType,
  entityId: EntityId
}) {}
