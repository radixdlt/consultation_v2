import { Schema } from 'effect'

export const TemperatureCheckId = Schema.Number.pipe(
  Schema.brand('TemperatureCheckId')
)

export type TemperatureCheckId = typeof TemperatureCheckId.Type

export const ProposalId = Schema.Number.pipe(Schema.brand('ProposalId'))

export type ProposalId = typeof ProposalId.Type

export const EntityType = Schema.Literal('temperature_check', 'proposal')

export type EntityType = typeof EntityType.Type

export const EntityId = Schema.Number.pipe(Schema.brand('EntityId'))

export type EntityId = typeof EntityId.Type
