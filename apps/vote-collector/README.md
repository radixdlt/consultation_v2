# Vote Collector

Vote collector for Radix governance, built with [Effect](https://effect.website/). Supports two deployment modes: **SST v3** (serverless Lambda + Cron) and a self-contained **HTTP server** (Hono + Node.js, deployed via Docker).

## Architecture

- **HTTP server** (Hono): self-contained Node.js server exposing `GET /vote-results` and `GET /account-votes`, with an embedded poll scheduler (1-minute interval via `Effect.repeat`). Runs database migrations on startup. Deployed via Docker.
- **SST Cron** (`Poll`): fires every minute via `sst.aws.Cron`, polls the Radix Gateway for new governance transactions, processes events and recalculates votes. Loops until the page is drained (< 100 txs).
- **SST API** (`Api`): `GET /vote-results` and `GET /account-votes`, backed by API Gateway V2.
- **Database**: PostgreSQL via Drizzle ORM. Schema lives in `packages/database/src/schema.ts`.

## Environment

SST automatically loads `.env` and `.env.<stage>` files.

> **Precedence**: `.env` overrides `.env.<stage>`. Keep shared defaults in `.env.<stage>` and local overrides in `.env`.

Copy the example file from the repo root to get started:

```sh
cp .env.example .env
```

| Variable       | Description                                    | Default |
| -------------- | ---------------------------------------------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string                   | —       |
| `NETWORK_ID`   | Radix network (`1` = mainnet, `2` = stokenet)  | `2`     |
| `POLL_TIMEOUT_DURATION` | Poll Lambda timeout (Effect duration, e.g. `120 seconds`) | `120 seconds` |
| `DEX_POSITION_CONCURRENCY` | Max concurrent DEX position computations | `3` |
| `SERVER_PORT` | HTTP server listen port (HTTP mode only) | `4000` |
| `ENV` | Environment name (`production`, `development`) | — |

## Vote Power Sources

Vote power is calculated from 6 source categories: **XRD** direct holdings, **LSU** (liquid staking units), **LSULP** (liquid staking unit LP), **pool units** (fungible LP tokens), **precision pools** (Ociswap concentrated liquidity), and **shape pools** (CaviarNine concentrated liquidity).

### Epoch-based configuration

Source configuration is **time-versioned** via epochs in `src/vote-calculation/voteSourceConfig.ts`. Each epoch has an `effectiveFrom` date, source toggles, and pool lists. When calculating vote power for a proposal, the system selects the epoch whose `effectiveFrom <= proposal.start` (newest matching epoch wins). This ensures historical proposals can always be recalculated with the config that was active at the time.

### Changing which sources are counted

To change which sources count toward vote power, **prepend a new epoch** to `VOTE_POWER_EPOCHS` in `voteSourceConfig.ts`. Keep old epochs intact for historical recalculation.

### Adding or removing pools

**Never modify existing pool arrays** in `src/vote-calculation/dex/constants/addresses.ts` — old epochs reference them, so changing them would silently alter historical vote power calculations. Existing arrays are suffixed with their epoch (e.g. `POOL_UNIT_POOLS_EPOCH_0`). Instead, create a **new** array for your epoch (e.g. `POOL_UNIT_POOLS_EPOCH_1`) and reference it from the new epoch entry. You can also define the pool list inline in the epoch itself.

This way each epoch is a self-contained snapshot: past proposals always recalculate with exactly the pools that were active at the time.

### Example: disable everything except XRD

```ts
// In VOTE_POWER_EPOCHS, prepend before the existing epoch:
{
  effectiveFrom: new Date('2026-06-01'),
  sources: { xrd: true, lsu: false, lsulp: false },
  precisionPools: [],
  poolUnitPools: [],
  shapePools: []
}
```

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `tsx --watch src/http-server.ts` | Hono HTTP server with hot reload |
| `sst:dev` | `sst dev --stage local` | Local dev with live Lambda emulation |
| `sst:deploy:stokenet` | `sst deploy --stage stokenet` | Deploy to stokenet stage |
| `sst:deploy:mainnet` | `sst deploy --stage production` | Deploy to production stage |
| `sst:remove:local` | `sst remove --stage local` | Tear down local stage |
| `sst:remove:stokenet` | `sst remove --stage stokenet` | Tear down stokenet stage |
| `sst:remove:mainnet` | `sst remove --stage mainnet` | Tear down mainnet stage |

Usage: `pnpm dev`, `pnpm sst:deploy:stokenet`, etc.

> **Windows users**: SST dev mode does not work natively on Windows. Use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) instead.

## AWS Credentials

SST uses the standard AWS credential chain. See the [SST IAM credentials docs](https://sst.dev/docs/iam-credentials) for setup instructions.

## Custom Domain

To attach a custom domain to the API, add a `domain` property to the `ApiGatewayV2` construct in `sst.config.ts`:

```ts
const api = new sst.aws.ApiGatewayV2('Api', {
  domain: 'api.example.com'
})
```

When using a supported DNS provider (Route 53, Cloudflare, or Vercel), SST **auto-provisions an ACM certificate** and creates the required DNS records.

### DNS provider variants

**Cloudflare**

```ts
domain: {
  name: 'api.example.com',
  dns: sst.cloudflare.dns()
}
```

**Vercel**

```ts
domain: {
  name: 'api.example.com',
  dns: sst.vercel.dns()
}
```

**Route 53 (explicit hosted zone)**

```ts
domain: {
  name: 'api.example.com',
  dns: sst.aws.dns({ zone: 'Z1234567890' })
}
```

**External DNS (bring your own cert)**

If your DNS is managed outside a supported provider, provision an ACM certificate yourself and pass its ARN:

```ts
domain: {
  name: 'api.example.com',
  cert: 'arn:aws:acm:us-east-1:123456789:certificate/abcd-1234'
}
```

### Stage-based subdomain

Use the stage name to isolate environments:

```ts
domain: `${$app.stage}.api.example.com`
```

This gives you `production.api.example.com`, `development.api.example.com`, etc.

### Base path mounting

Mount the API under a path prefix:

```ts
domain: {
  name: 'api.example.com',
  path: 'v1'
}
```

Requests to `api.example.com/v1/*` route to this API, letting you version or share a domain across multiple services.

> See the [SST ApiGatewayV2 docs](https://sst.dev/docs/component/aws/apigatewayv2#custom-domain) for the full reference.
