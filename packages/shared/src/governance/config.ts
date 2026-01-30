import { ComponentAddress } from '@radix-effects/shared'
import { Context, Layer } from 'effect'

export class Config extends Context.Tag('Config')<
  Config,
  { readonly componentAddress: ComponentAddress }
>() {
  static StokenetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make(
      'component_tdx_2_1crtxw4zzlrcl6t86ku9e094l4n7g44n3c48ng4vm5kz9t74vr8rpmv'
    )
  })
}
