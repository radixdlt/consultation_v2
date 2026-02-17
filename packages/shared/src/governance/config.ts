import {
  ComponentAddress,
  FungibleResourceAddress
} from '@radix-effects/shared'
import { Context, Effect, Layer, Config as ConfigEffect, Data } from 'effect'

export class UnsupportedNetworkIdError extends Data.TaggedError(
  '@GovernenceConfig/UnsupportedNetworkIdError'
)<{
  message: string
}> {}

export class GovernanceConfig extends Context.Tag('@Governance/Config')<
  GovernanceConfig,
  {
    readonly componentAddress: ComponentAddress
    readonly adminBadgeAddress: FungibleResourceAddress
    readonly xrdResourceAddress: FungibleResourceAddress
  }
>() {
  static StokenetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make(
      'component_tdx_2_1cqnp3rptnwqjc4r7kzwkctec09jkdqa8v2rue580kw66fvt4ctpnmc'
    ),
    adminBadgeAddress: FungibleResourceAddress.make(
      'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
    ),
    xrdResourceAddress: FungibleResourceAddress.make(
      'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
    )
  })

  static MainnetLive = Layer.succeed(this, {
    componentAddress: ComponentAddress.make('TODO_MAINNET_COMPONENT_ADDRESS'),
    adminBadgeAddress: FungibleResourceAddress.make(
      'TODO_MAINNET_ADMIN_BADGE_ADDRESS'
    ),
    xrdResourceAddress: FungibleResourceAddress.make(
      'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd'
    )
  })
}

export const GovernanceConfigLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const networkId = yield* ConfigEffect.number('NETWORK_ID').pipe(
      Effect.orDie
    )

    if (networkId === 1) {
      return GovernanceConfig.MainnetLive
    } else if (networkId === 2) {
      return GovernanceConfig.StokenetLive
    } else {
      return yield* new UnsupportedNetworkIdError({
        message: `Unsupported network ID: ${networkId}`
      })
    }
  })
)
