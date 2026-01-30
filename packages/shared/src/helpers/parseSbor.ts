import type { ProgrammaticScryptoSborValue } from '@radixdlt/babylon-gateway-api-sdk'
import { Data, Effect } from 'effect'
import type { SborError, SborSchema } from 'sbor-ez-mode'

export class FailedToParseSborError extends Data.TaggedError(
  'FailedToParseSborError'
)<{
  error: SborError
}> {}

export const parseSbor = <T>(
  sbor: ProgrammaticScryptoSborValue,
  schema: SborSchema<T>
) =>
  Effect.gen(function* () {
    const result = schema.safeParse(sbor)

    if (result.isErr()) {
      return yield* new FailedToParseSborError({
        error: result.error
      })
    }

    return result.value
  })
