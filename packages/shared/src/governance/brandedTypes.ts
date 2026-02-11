import { Schema } from 'effect'

export const EntityId = Schema.Number.pipe(Schema.brand('EntityId'))

export type EntityId = typeof EntityId.Type

export const TemperatureCheckId = EntityId.pipe(
  Schema.brand('TemperatureCheckId')
)

export type TemperatureCheckId = typeof TemperatureCheckId.Type

export const ProposalId = EntityId.pipe(Schema.brand('ProposalId'))

export type ProposalId = typeof ProposalId.Type

export const EntityType = Schema.Literal('temperature_check', 'proposal')

export type EntityType = typeof EntityType.Type
