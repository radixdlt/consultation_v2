import { AccountAddress } from '@radix-effects/shared'
import * as EffectBoolean from 'effect/Boolean'
import * as Either from 'effect/Either'
import { constant, pipe } from 'effect/Function'
import { TreeFormatter } from 'effect/ParseResult'
import * as Schema from 'effect/Schema'

class EnvVars extends Schema.Class<EnvVars>('EnvVars')({
  ENV: Schema.Literal('dev', 'staging', 'prod', 'local').annotations({
    decodingFallback: () => Either.right('prod' as const)
  }),
  DAPP_DEFINITION_ADDRESS: AccountAddress,
  NETWORK_ID: Schema.NumberFromString
}) {}

const isVitest = typeof import.meta.env.VITEST !== 'undefined'

const vitestMockEnvVars: typeof EnvVars.Encoded = {
  ENV: 'dev',
  DAPP_DEFINITION_ADDRESS: AccountAddress.make(
    'account_rdx129xqyvgkn9h73atyrzndal004fwye3tzw49kkygv9ltm2kyrv2lmda'
  ),
  NETWORK_ID: '1'
}

export const envVars = pipe(
  EffectBoolean.match(isVitest, {
    onTrue: constant(vitestMockEnvVars),
    onFalse: constant({
      ENV: import.meta.env.VITE_ENV as unknown,
      DAPP_DEFINITION_ADDRESS: import.meta.env
        .VITE_PUBLIC_DAPP_DEFINITION_ADDRESS as unknown,
      NETWORK_ID: import.meta.env.VITE_PUBLIC_NETWORK_ID as unknown
    } satisfies Record<keyof typeof EnvVars.Encoded, unknown>)
  }),
  Schema.decodeUnknownEither(EnvVars),
  Either.map((envVars) => ({
    ...envVars,
    EFFECTIVE_ENV: envVars.ENV === 'local' ? 'dev' : envVars.ENV
  })),
  Either.getOrElse((parseIssue) => {
    throw new Error(
      `❌ Invalid environment variables: ${TreeFormatter.formatErrorSync(parseIssue)}`
    )
  })
)
