import { Config, Effect, Layer, Logger, ManagedRuntime, Option } from 'effect'

import { GovernanceConfigLayer } from 'shared/governance/index'
import { ORM } from './db/orm'
import { PgClientLive } from './db/pgClient'
import { PollService } from './poll'
import { PollLock } from './pollLock'
import { VoteCalculationRepo } from './vote-calculation/voteCalculationRepo'
import { GatewayApiClientLayer } from 'shared/gateway'
import { DatabaseMigrations } from './db/migrate'

const LoggerLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const ENV = (yield* Config.option(Config.string('ENV'))).pipe(
      Option.getOrNull
    )

    if (ENV === 'production') {
      return Logger.json
    } else {
      return Logger.pretty
    }
  })
)

const CronJobHandlerLayer = PollService.Default.pipe(
  Layer.provideMerge(PollLock.Default),
  Layer.provide(ORM.Default),
  Layer.provideMerge(GatewayApiClientLayer),
  Layer.provideMerge(GovernanceConfigLayer),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(Logger.json)
)

const HttpHandlerLayer = VoteCalculationRepo.Default.pipe(
  Layer.provide(ORM.Default),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(Logger.json)
)

export const CronRuntime = ManagedRuntime.make(CronJobHandlerLayer)
export const HttpRuntime = ManagedRuntime.make(HttpHandlerLayer)

export const HttpServerLayer = Layer.mergeAll(
  PollService.Default,
  VoteCalculationRepo.Default,
  DatabaseMigrations.Default
).pipe(
  Layer.provideMerge(PollLock.Default),
  Layer.provide(ORM.Default),
  Layer.provideMerge(GatewayApiClientLayer),
  Layer.provideMerge(GovernanceConfigLayer),
  Layer.provideMerge(PgClientLive),
  Layer.provideMerge(LoggerLayer)
)
