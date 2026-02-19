import {
  HexString,
  TransactionManifestString,
  Account,
  Amount,
  ComponentAddress,
  FungibleResourceAddress,
  PackageAddress
} from '@radix-effects/shared'
import {
  createAccount,
  Signer,
  TransactionHelper
} from '@radix-effects/tx-tool'
import {
  ConfigProvider,
  Effect,
  Layer,
  Logger,
  Redacted,
  Array as A,
  pipe,
  Option,
  Context,
  Config,
  Encoding,
  Duration
} from 'effect'
import { live } from '@effect/vitest'
import { GatewayApiClientLayer } from 'shared/gateway'
import {
  GovernanceConfig,
  GovernanceConfigLayer
} from 'shared/governance/config'
import { GovernanceComponent } from 'shared/governance/governanceComponent'
import { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { GetFungibleBalance } from '@radix-effects/gateway'
import { PollService } from '../poll'
import { ORM } from '../db/orm'
import { PgContainer } from '../db/pgContainer'
import { DatabaseMigrations } from '../db/migrate'
import {
  config as configTable,
  voteCalculationResults as voteCalculationResultsTable,
  voteCalculationState as voteCalculationStateTable,
  voteCalculationAccountVotes as voteCalculationAccountVotesTable
} from 'db/src/schema'

class TestConfig extends Context.Tag('@TestConfig')<
  TestConfig,
  {
    readonly componentAddress: Option.Option<ComponentAddress>
    readonly account: Account
    readonly PrivatekeySignerLayer: Layer.Layer<Signer, never, never>
  }
>() {}

const TestLayer = Layer.mergeAll(
  TransactionHelper.Default,
  GetFungibleBalance.Default
).pipe(
  Layer.provideMerge(
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const db = yield* PgContainer

        return DatabaseMigrations.Default.pipe(
          Layer.provide(
            Layer.setConfigProvider(
              ConfigProvider.fromJson({ DATABASE_URL: db.getConnectionUri() })
            )
          )
        )
      })
    )
  ),
  Layer.provide(PgContainer.Default),
  Layer.provideMerge(ORM.Default),
  Layer.provideMerge(PgContainer.ClientLive),
  Layer.provideMerge(GatewayApiClientLayer),
  Layer.provideMerge(GovernanceConfigLayer),
  Layer.provideMerge(
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const privateKeyHexFromEnv = yield* Config.option(
          Config.string('INTEGRATION_TEST_PRIVATE_KEY_HEX')
        )

        const { privateKeyHex, address } = yield* privateKeyHexFromEnv.pipe(
          Option.match({
            onNone: () =>
              createAccount({
                networkId: 2
              }),
            onSome: (privateKeyHex) =>
              Encoding.decodeHex(privateKeyHex).pipe(
                Effect.flatMap((bytes) =>
                  createAccount({
                    networkId: 2,
                    privateKey: bytes
                  })
                )
              )
          })
        )

        yield* Effect.log('Account created', { privateKeyHex, address })

        const account = {
          address: address,
          type: 'unsecurifiedAccount' as const
        }

        const PrivatekeySignerLayer = Signer.makePrivateKeySigner(
          Redacted.make(HexString.make(privateKeyHex))
        )

        return Layer.merge(
          Layer.succeed(TestConfig, {
            account,
            componentAddress: Option.some(
              ComponentAddress.make(
                'component_tdx_2_1cqz0v72y7a5kt76lqalakadsc7ksrsjqactdarqylr5dkq3x3mf2hp'
              )
            ),
            PrivatekeySignerLayer
          }),
          PrivatekeySignerLayer
        )
      })
    )
  ),
  Layer.provide(
    Layer.setConfigProvider(
      ConfigProvider.fromJson({
        NETWORK_ID: 2,
        INTEGRATION_TEST_PRIVATE_KEY_HEX:
          process.env.INTEGRATION_TEST_PRIVATE_KEY_HEX
      })
    )
  )
)

const makeGovernanceConfigLayer = (componentAddress: ComponentAddress) =>
  Layer.succeed(GovernanceConfig, {
    packageAddress: PackageAddress.make(
      'package_tdx_2_1p5cv7gym87c8dnsdx8rlv587mqw34v6qmska5ctxh04st0t07wq32s'
    ),
    componentAddress,
    adminBadgeAddress: FungibleResourceAddress.make(
      'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
    ),
    xrdResourceAddress: FungibleResourceAddress.make(
      'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
    )
  })

const testSetup = Effect.gen(function* () {
  const transactionHelper = yield* TransactionHelper
  const testConfig = yield* TestConfig
  const fungibleTokens = yield* GetFungibleBalance
  const config = yield* GovernanceConfig

  const hasXrdBalance = yield* fungibleTokens({
    addresses: [testConfig.account.address]
  }).pipe(
    Effect.map((result) =>
      pipe(
        result,
        A.head,
        Option.map((item) => item.items),
        Option.getOrThrow,
        A.findFirst(
          (balance) => balance.resource_address === config.xrdResourceAddress
        ),
        Option.map((balance) => balance.amount.gt(1000)),
        Option.getOrElse(() => false)
      )
    )
  )

  if (!hasXrdBalance)
    yield* transactionHelper
      .faucet({
        account: testConfig.account
      })
      .pipe(Effect.annotateLogs('manifest', 'faucet'))

  yield* Effect.log('Instantiating governance component')

  const componentAddress = yield* testConfig.componentAddress.pipe(
    Option.match({
      onNone: () => instantiateGovernanceComponent(),
      onSome: (componentAddress) => Effect.succeed(componentAddress)
    })
  )

  return { componentAddress }
})

const instantiateGovernanceComponent = Effect.fn(function* () {
  const config = yield* GovernanceConfig
  const transactionHelper = yield* TransactionHelper
  const testConfig = yield* TestConfig

  const manifest = TransactionManifestString.make(`
  CALL_FUNCTION
    Address("${config.packageAddress}")
    "Governance"
    "instantiate"
    Address("${config.xrdResourceAddress}")
    Tuple(
      7u16,
      Decimal("10000"),
      Decimal("0.5"),
      7u16,
      Decimal("100000"),
      Decimal("0.5")
    );`)

  const componentAddress = yield* transactionHelper
    .submitTransaction({
      manifest,
      feePayer: { account: testConfig.account, amount: Amount.make('100') }
    })
    .pipe(
      Effect.flatMap(({ id }) => transactionHelper.getCommittedDetails({ id })),
      Effect.map((receipt) =>
        pipe(
          receipt.transaction.affected_global_entities,
          Option.fromNullable,
          Option.flatMap((arr) =>
            A.findFirst(arr, (entity) => entity.startsWith('component_'))
          ),
          Option.getOrThrow,
          ComponentAddress.make
        )
      ),
      Effect.annotateLogs('manifest', 'instantiateGovernanceComponent')
    )

  return componentAddress
})

const createTemperatureCheck = Effect.fn(function* () {
  const transactionHelper = yield* TransactionHelper
  const governanceComponent = yield* GovernanceComponent
  const testConfig = yield* TestConfig

  const manifest = yield* governanceComponent.makeTemperatureCheckManifest({
    authorAccount: testConfig.account.address,
    title: 'Test Temperature Check',
    shortDescription: 'Test Temperature Check',
    description: 'Test Temperature Check',
    voteOptions: ['Test Vote Option 1', 'Test Vote Option 2'],
    links: ['https://example.com'],
    maxSelections: 1
  })

  const temperatureCheckId = yield* transactionHelper
    .submitTransaction({
      manifest,
      feePayer: { account: testConfig.account, amount: Amount.make('100') }
    })
    .pipe(
      Effect.annotateLogs('manifest', 'createTemperatureCheck'),
      Effect.flatMap(({ id }) => transactionHelper.getCommittedDetails({ id })),
      Effect.map((receipt) =>
        pipe(
          receipt.transaction.receipt?.events,
          Option.fromNullable,
          Option.flatMap((events) =>
            A.findFirst(
              events,
              (event) => event.name === 'TemperatureCheckCreatedEvent'
            )
          ),
          Option.getOrThrow,

          (event) =>
            event.data.kind === 'Tuple'
              ? event.data.fields[0]?.kind === 'U64'
                ? Option.some(Number(event.data.fields[0].value))
                : Option.none()
              : Option.none(),
          Option.getOrThrow,
          TemperatureCheckId.make
        )
      )
    )

  yield* Effect.log('Temperature check id', temperatureCheckId)

  return temperatureCheckId
})

const voteOnTemperatureCheck = Effect.fn(function* (
  temperatureCheckId: TemperatureCheckId
) {
  const transactionHelper = yield* TransactionHelper
  const governanceComponent = yield* GovernanceComponent
  const testConfig = yield* TestConfig

  const manifest = yield* governanceComponent.makeTemperatureCheckVoteManifest({
    accountAddress: testConfig.account.address,
    temperatureCheckId: temperatureCheckId,
    vote: 'For'
  })

  yield* transactionHelper
    .submitTransaction({
      manifest,
      feePayer: { account: testConfig.account, amount: Amount.make('100') }
    })
    .pipe(Effect.annotateLogs('manifest', 'voteOnTemperatureCheck'))
})

const resetDatabase = Effect.fn(function* () {
  const db = yield* ORM
  const databaseMigrations = yield* DatabaseMigrations
  yield* databaseMigrations()

  yield* db.delete(configTable)
  yield* db.delete(voteCalculationStateTable)
  yield* db.delete(voteCalculationResultsTable)
  yield* db.delete(voteCalculationAccountVotesTable)
})

live(
  'voteCalculation',
  () =>
    Effect.gen(function* () {
      const db = yield* ORM

      yield* Effect.log('Bootstrapping test setup')

      yield* resetDatabase()

      // conditionally instantiate governance component
      const { componentAddress } = yield* testSetup

      yield* Effect.log({ componentAddress })

      yield* Effect.gen(function* () {
        const governanceComponent = yield* GovernanceComponent
        const poll = yield* PollService

        yield* Effect.sleep(Duration.seconds(5))

        yield* poll()

        const temperatureCheckId = yield* createTemperatureCheck()

        yield* Effect.log('Temperature check id', temperatureCheckId)

        const temperatureCheck =
          yield* governanceComponent.getTemperatureCheckById(temperatureCheckId)

        yield* Effect.log('Temperature check', temperatureCheck)

        yield* voteOnTemperatureCheck(temperatureCheckId)

        yield* Effect.sleep(Duration.seconds(10))

        yield* poll()
      }).pipe(
        Effect.provide(
          Layer.merge(GovernanceComponent.Default, PollService.Default).pipe(
            Layer.provideMerge(makeGovernanceConfigLayer(componentAddress))
          )
        )
      )
    }).pipe(Effect.provide([TestLayer, Logger.pretty])),
  300_000
)
