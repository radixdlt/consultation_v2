import { ComponentAddress } from '@radix-effects/shared'
import { Context, Layer } from 'effect'

export class Config extends Context.Tag('Config')<
  Config,
  { readonly componentAddress: ComponentAddress }
>() {
  static StokenetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make(
      'component_tdx_2_1cqhzn2gn0p8flzmuyelywtrshnf462zv27l6hfxjzuyvzka2mu8wz6'
    )
  })
}
