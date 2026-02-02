import { ComponentAddress } from '@radix-effects/shared'
import { Context, Layer } from 'effect'

export class Config extends Context.Tag('Config')<
  Config,
  { readonly componentAddress: ComponentAddress }
>() {
  static StokenetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make(
      'component_tdx_2_1cz4jgejhc5z306tg26rkhkm90nssrcjqf0paps8kne6eqtn279mter'
    )
  })
}
