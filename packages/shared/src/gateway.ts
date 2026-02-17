import { GatewayApiClient } from '@radix-effects/gateway'
import { Config, ConfigProvider, Data, Effect, Layer } from 'effect'

export class UnsupportedNetworkIdError extends Data.TaggedError(
  '@GatewayClient/UnsupportedNetworkIdError'
)<{
  message: string
}> {}

export const GatewayApiClientLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const networkId = yield* Config.number('NETWORK_ID').pipe(Effect.orDie)

    if (networkId === 1) {
      return GatewayApiClient.Default
    } else if (networkId === 2) {
      return GatewayApiClient.Default.pipe(
        Layer.provide(
          Layer.setConfigProvider(ConfigProvider.fromJson({ NETWORK_ID: 2 }))
        )
      )
    } else {
      return yield* new UnsupportedNetworkIdError({
        message: `Unsupported network ID: ${networkId}`
      })
    }
  })
)
