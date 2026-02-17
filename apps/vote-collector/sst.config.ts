/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(_) {
    const awsRegion = (process.env.AWS_REGION ??
      'eu-west-1') as $util.Input<aws.Region>

    return {
      name: 'vote-collector',
      removal: 'remove',
      protect: false,
      home: 'aws',
      providers: {
        aws: { region: awsRegion }
      }
    }
  },
  async run() {
    const { Config, Duration, Effect } = await import('effect')

    const { databaseUrl, networkId, pollTimeoutDuration } = Effect.runSync(
      Effect.gen(function* () {
        const databaseUrl = yield* Config.string('DATABASE_URL').pipe(
          Effect.orDie
        )
        const networkId = yield* Config.string('NETWORK_ID').pipe(
          Config.withDefault(2)
        )
        const pollTimeoutDuration = yield* Config.duration(
          'POLL_TIMEOUT_DURATION'
        ).pipe(
          Config.withDefault(Duration.seconds(120)),
          Effect.map(Duration.toSeconds),
          Effect.orDie
        )

        return { databaseUrl, networkId, pollTimeoutDuration }
      })
    )

    const commonFnProps = {
      runtime: 'nodejs22.x' as const,
      environment: {
        DATABASE_URL: databaseUrl,
        NETWORK_ID: networkId.toString(),
        POLL_TIMEOUT_DURATION: `${pollTimeoutDuration} seconds`
      },
      nodejs: {
        install: ['pg']
      }
    }

    new sst.aws.Cron('Poll', {
      function: {
        handler: 'src/handlers.poll',
        timeout: `${pollTimeoutDuration} seconds`,
        ...commonFnProps
      },
      schedule: 'rate(1 minute)'
    })

    const api = new sst.aws.ApiGatewayV2('Api')

    api.route('GET /vote-results', {
      handler: 'src/handlers.getVoteResults',
      timeout: '30 seconds',
      ...commonFnProps
    })

    api.route('GET /account-votes', {
      handler: 'src/handlers.getAccountVotes',
      timeout: '30 seconds',
      ...commonFnProps
    })

    return { api: api.url }
  }
})
