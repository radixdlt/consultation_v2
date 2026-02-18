import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { URL } from 'url'
import { Effect, Layer } from 'effect'
import { NodeContext } from '@effect/platform-node'
import { DatabaseMigrations } from './db/migrate'
import { getVoteResults, getAccountVotes, poll } from './handlers'

const PORT = Number(process.env.PORT ?? 3001)
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 60_000)

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

function parseQuery(req: IncomingMessage): Record<string, string> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

function sendJson(res: ServerResponse, statusCode: number, body: string) {
  res.writeHead(statusCode, corsHeaders)
  res.end(body)
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const pathname = url.pathname

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    switch (pathname) {
      case '/health': {
        sendJson(res, 200, JSON.stringify({ status: 'ok' }))
        return
      }
      case '/vote-results': {
        const result = await getVoteResults({
          queryStringParameters: parseQuery(req)
        } as any)
        sendJson(
          res,
          (result as any).statusCode ?? 200,
          typeof result === 'string' ? result : ((result as any).body ?? '')
        )
        return
      }
      case '/account-votes': {
        const result = await getAccountVotes({
          queryStringParameters: parseQuery(req)
        } as any)
        sendJson(
          res,
          (result as any).statusCode ?? 200,
          typeof result === 'string' ? result : ((result as any).body ?? '')
        )
        return
      }
      default: {
        sendJson(res, 404, JSON.stringify({ error: 'Not found' }))
      }
    }
  } catch (error) {
    console.error('Unhandled request error:', error)
    sendJson(res, 500, JSON.stringify({ error: 'Internal server error' }))
  }
}

async function runMigrations() {
  const MigrationLayer = DatabaseMigrations.Default.pipe(
    Layer.provide(NodeContext.layer)
  )

  await Effect.gen(function* () {
    const migrations = yield* DatabaseMigrations
    yield* migrations()
  }).pipe(
    Effect.provide(MigrationLayer),
    Effect.catchAllDefect((defect) => {
      console.error('Migration failed:', defect)
      return Effect.die(defect)
    }),
    Effect.runPromise
  )
}

async function startPolling() {
  console.log(`Starting poll cron (interval: ${POLL_INTERVAL_MS}ms)`)

  const runPoll = async () => {
    try {
      await poll()
      console.log('Poll completed successfully')
    } catch (error) {
      console.error('Poll error:', error)
    }
  }

  // Run once immediately
  await runPoll()

  // Then on interval
  setInterval(runPoll, POLL_INTERVAL_MS)
}

async function main() {
  console.log('Running database migrations...')
  await runMigrations()
  console.log('Migrations complete')

  const server = createServer(handleRequest)

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Vote collector listening on http://0.0.0.0:${PORT}`)
  })

  await startPolling()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
