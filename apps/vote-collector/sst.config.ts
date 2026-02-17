/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'vote-collector',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: { region: 'eu-west-1' }
      }
    }
  },
  async run() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    if (!process.env.NETWORK_ID) throw new Error('NETWORK_ID is not set')

    const commonFnProps = {
      runtime: 'nodejs22.x' as const,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL,
        NETWORK_ID: process.env.NETWORK_ID
      },
      nodejs: {
        install: ['pg']
      }
    }

    new sst.aws.Cron('Poll', {
      function: {
        handler: 'src/handlers.poll',
        timeout: '120 seconds',
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
