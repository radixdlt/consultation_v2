import { Schema } from 'effect'

export const TemperatureCheckId = Schema.Number.pipe(
  Schema.brand('TemperatureCheckId')
)

export type TemperatureCheckId = typeof TemperatureCheckId.Type
