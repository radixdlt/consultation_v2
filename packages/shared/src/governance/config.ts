import { ComponentAddress } from '@radix-effects/shared'
import { Context, Layer } from 'effect'

export class Config extends Context.Tag('Config')<
  Config,
  { readonly componentAddress: ComponentAddress }
>() {
  static StokenetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make(
      'component_tdx_2_1crgv7j32cvguxtteme62c8989fxxehlv4aamvzrxzyswc0cfu8m8va'
    )
  })
}
