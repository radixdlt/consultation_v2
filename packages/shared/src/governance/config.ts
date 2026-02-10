import {
  ComponentAddress,
  FungibleResourceAddress
} from '@radix-effects/shared'
import { Context, Layer } from 'effect'

export class Config extends Context.Tag('Config')<
  Config,
  {
    readonly componentAddress: ComponentAddress
    readonly adminBadgeAddress: FungibleResourceAddress
    readonly xrdResourceAddress: FungibleResourceAddress
  }
>() {
  static StokenetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make(
      'component_tdx_2_1czr790e327846tcfvl5298da9h2lu8ngm97qg3nn93shkyngjjlau8'
    ),
    adminBadgeAddress: FungibleResourceAddress.make(
      'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
    ),
    xrdResourceAddress: FungibleResourceAddress.make(
      'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
    )
  })
}
