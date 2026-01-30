import { GatewayApiClient } from '@radix-effects/gateway'
import { ConfigProvider, Layer } from 'effect'

export const StokenetGatewayApiClientLayer = GatewayApiClient.Default.pipe(
  Layer.provide(
    Layer.setConfigProvider(ConfigProvider.fromJson({ NETWORK_ID: 2 }))
  )
)
