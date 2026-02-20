# Consultation & Vote Collector

A governance dApp for Radix DLT. The on-chain Scrypto blueprints manage temperature checks, proposals, and voting. The web app displays votes and counts results off-chain.

## On-Chain Setup

Before running the web app, you need a deployed Governance component on the Radix ledger. See [`scrypto/README.md`](scrypto/README.md) for the full guide — building the blueprints, deploying the package, creating an owner badge, instantiating the component, and creating admin badges.

After deployment, update the governance addresses in `packages/shared/src/governance/config.ts` — the `TODO_*` placeholders for `packageAddress`, `componentAddress`, and `adminBadgeAddress` must be replaced with the addresses from your deployment (see [step 5 in the Scrypto README](scrypto/README.md#5-configure-the-web-app)).

## Prerequisites

- **Node 22+** (see `engines` in root `package.json`)
- **pnpm** (corepack-managed — `corepack enable` if not already active)
- **AWS credentials** (SST path only) — SST uses the standard credential chain (`AWS_PROFILE`, env vars, etc.). See [SST IAM credentials docs](https://sst.dev/docs/iam-credentials). Not needed for Docker deployment.
- **Docker** (recommended) or a PostgreSQL instance

## Setup

```sh
pnpm install
docker compose up -d   # starts Postgres 17 on :5432
pnpm db:migrate        # requires DATABASE_URL in env
```

| Variable       | Description                                   | Default |
| -------------- | --------------------------------------------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string                  | —       |
| `NETWORK_ID`   | Radix network (`1` = mainnet, `2` = stokenet) | `2`     |
| `POLL_TIMEOUT_DURATION` | Poll Lambda timeout (Effect duration, e.g. `120 seconds`) | `120 seconds` |
| `SERVER_PORT` | HTTP server listen port (Docker/HTTP mode only) | `4000` |
| `ENV` | Environment name (`production`, `development`) | — |
| `LEDGER_STATE_VERSION` | Override ledger cursor position (see below) | — |

### Ledger cursor override

Set `LEDGER_STATE_VERSION` to rewind (or fast-forward) the poll cursor to a specific state version. The override is **idempotent** — it won't re-apply if the value hasn't changed, so it's safe to leave set permanently.

How it works: the last applied override value is stored in the DB. On startup, if the env var matches that stored value the override is skipped. If it differs, the cursor is moved and the new value is remembered.

| Scenario | What happens |
| --- | --- |
| Set `LEDGER_STATE_VERSION=500` for the first time | Cursor moves to 500 |
| Lambda restarts, env var still `500` | Already applied — nothing changes |
| Change env var to `800` | Cursor moves to 800 |
| Remove the env var entirely | Override is inactive, cursor advances normally |

## Running locally

```sh
pnpm dev   # starts both apps via Turbo
```

Or run each app individually:

### Vote Collector

```sh
pnpm -F vote-collector dev       # → Hono HTTP server on :4000 (default)
pnpm -F vote-collector sst:dev   # → SST live Lambda proxy (requires AWS credentials)
```

The default `dev` command starts a self-contained Node.js HTTP server (Hono + Effect) with an embedded poll scheduler — no AWS account needed.

The `sst:dev` command deploys **real AWS infrastructure** (API Gateway, Lambda, Cron) and routes Lambda invocations back to your local machine via the SST Live Lambda proxy. On first run, SST prints the API Gateway URL (stable per stage). Copy it — you'll need it for the consultation app.

### Consultation dApp

```sh
pnpm -F consultation-dapp dev   # → Vite on :3000
```

Set `VITE_VOTE_COLLECTOR_URL` to the API Gateway URL printed by SST above. You can export it in your shell, add it to a `.env` file in `apps/consultation`, or use [direnv](https://direnv.net/) with an `.envrc`.

## Deploying Vote Collector

### Prerequisites

- AWS credentials configured (see Prerequisites above)
- PostgreSQL database accessible from Lambda (e.g. RDS, Neon, Supabase)
- An environment file in the repo root — copy `.env.example` and fill in the values.
  The deploy script (`deploy.sh`) sources it and exports the variables to SST.

  | Environment | Env file | SST stage | `NETWORK_ID` | Deploy command |
  |---|---|---|---|---|
  | Stokenet | `.env.stokenet` | `stokenet` | `2` | `pnpm deploy:vote-collector:stokenet` |
  | Mainnet | `.env.mainnet` | `production` | `1` | `pnpm deploy:vote-collector:mainnet` |

  Both files require `DATABASE_URL` and `NETWORK_ID`.

> **Mainnet only**: populate the governance addresses in
> `packages/shared/src/governance/config.ts` (`GovernanceConfig.MainnetLive`) —
> `packageAddress`, `componentAddress`, and `adminBadgeAddress`
> are currently set to `TODO_*` placeholders. These come from deploying and
> instantiating a Governance component — see [`scrypto/README.md`](scrypto/README.md#deploying-to-ledger)
> for the full walkthrough.

### Deploy

```sh
pnpm deploy:vote-collector:stokenet   # sources .env.stokenet, migrates, deploys to development stage
pnpm deploy:vote-collector:mainnet    # sources .env.mainnet, migrates, deploys to production stage
```

### What gets deployed

| Resource | Type | Details |
| --- | --- | --- |
| `Poll` | `sst.aws.Cron` | Lambda on a 1-minute schedule, polls Radix Gateway |
| `Api` | `sst.aws.ApiGatewayV2` | `GET /vote-results`, `GET /account-votes` |

Region: `eu-west-1`. Runtime: Node.js 22.

### Stage protection

The `production` stage has `protect: true` (prevents accidental deletion of resources) and `removal: retain` (resources are retained even if removed from config). All other stages use `removal: remove`.

### Teardown

```sh
# Remove stokenet
pnpm -F vote-collector sst:remove:stokenet

# Remove mainnet (resources are retained due to removal: retain)
pnpm -F vote-collector sst:remove:mainnet
```

> **Warning**: Production resources are retained after `sst remove`. You must manually delete them in the AWS console if needed.

### Verify

After deploying, the API URL is printed as an output. Verify with:

```sh
# Replace with your API URL
curl 'https://<api-url>/vote-results?type=proposal&entityId=1'
curl 'https://<api-url>/account-votes?type=proposal&entityId=1'
```

Check CloudWatch Logs for the `Poll` and `Api` Lambda functions to confirm execution.

## Deploying with Docker

As an alternative to SST/Lambda, the vote collector can run as a plain Node.js HTTP server deployed via Docker Compose with nginx reverse proxy and automatic TLS via Let's Encrypt. No AWS account required.

### Prerequisites

- Docker and Docker Compose
- An external PostgreSQL instance (e.g. managed Postgres, Supabase, Neon)
- DNS A records for two subdomains pointing to your server (e.g. `app.example.com`, `api.example.com`)
- If using Cloudflare: set SSL/TLS mode to **Full (Strict)**

### Services

| Service | Description |
| --- | --- |
| `nginx` | Reverse proxy with TLS termination (ports 80 + 443) |
| `certbot` | Automatic certificate renewal (checks every 12h) |
| `consultation` | Vite + React consultation dApp (internal port 3000) |
| `vote-collector` | Hono HTTP server + embedded poll scheduler (internal port 3001) |

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | — (required) |
| `NETWORK_ID` | Radix network (`1` = mainnet, `2` = stokenet) | — |
| `APP_DOMAIN` | Consultation dApp domain (e.g. `app.example.com`) | — (required) |
| `API_DOMAIN` | Vote collector API domain (e.g. `api.example.com`) | — (required) |
| `CERTBOT_EMAIL` | Email for Let's Encrypt notifications | — (required) |
| `CERTBOT_STAGING` | Set to `1` for staging certs (testing) | `0` |
| `VITE_PUBLIC_DAPP_DEFINITION_ADDRESS` | Radix dApp definition address | — |
| `VITE_PUBLIC_NETWORK_ID` | Radix network ID for the dApp | `2` |

### First-time setup

```sh
cp .env.example .env
# Edit .env with your values

# Test with staging certs first (avoids Let's Encrypt rate limits)
CERTBOT_STAGING=1 bash init-letsencrypt.sh

# Once verified, delete certbot/conf and re-run for production certs
rm -rf certbot/conf
bash init-letsencrypt.sh

# Start all services
docker compose -f docker-compose.production.yml up -d
```

### Certificate renewal

Certbot automatically checks for renewal every 12 hours. However, nginx needs a reload to pick up new certs. Add a host cron job:

```sh
# Reload nginx every 12 hours to pick up renewed certificates
0 */12 * * * docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

> **Alternative**: For zero-renewal setups behind Cloudflare, consider using a [Cloudflare Origin CA certificate](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) (15-year validity) instead of Let's Encrypt.

### Verify

```sh
curl "https://$APP_DOMAIN"
curl "https://$API_DOMAIN/vote-results?type=proposal&entityId=1"
```

### Local testing

To test the nginx routing, headers, and rate limiting locally without TLS or real DNS:

1. Add local DNS entries to `/etc/hosts`:

   ```
   127.0.0.1 app.local api.local
   ```

2. Set domains in `.env`:

   ```
   APP_DOMAIN=app.local
   API_DOMAIN=api.local
   ```

3. Start with the local override (HTTP-only, no certbot):

   ```sh
   docker compose -f docker-compose.production.yml -f docker-compose.local.yml up --build
   ```

4. Verify:

   ```sh
   curl http://app.local                                              # consultation HTML
   curl http://api.local/vote-results?type=proposal&entityId=1        # API response
   docker compose -f docker-compose.production.yml -f docker-compose.local.yml exec nginx nginx -t  # config test
   ```

## Deploying Consultation (standalone)

The consultation app is a [TanStack Start](https://tanstack.com/start) app that builds to a [Nitro](https://nitro.build) server output, deployable to any Node.js host, Vercel, Netlify, Cloudflare, and more.

### Build

```sh
pnpm -F consultation-dapp build
```

This produces a `.output/` directory containing the standalone server.

The following env vars are **baked at build time** (Vite static replacement) and must be set before building:

| Variable | Description |
| --- | --- |
| `VITE_ENV` | Environment name (e.g. `production`) |
| `VITE_VOTE_COLLECTOR_URL` | Vote collector API base URL |
| `VITE_PUBLIC_DAPP_DEFINITION_ADDRESS` | Radix dApp definition address |
| `VITE_PUBLIC_NETWORK_ID` | Radix network ID |

### Run

```sh
NITRO_HOST=0.0.0.0 NITRO_PORT=3000 node .output/server/index.mjs
```

### Platform presets

For platform-specific deployments (Vercel, Netlify, Cloudflare, etc.), see the [TanStack Start hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting).

For Docker-based deployment, see [Deploying with Docker](#deploying-with-docker) above.

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm db:studio` | Open Drizzle Studio (database browser) |
| `pnpm db:generate` | Generate a new Drizzle migration |
| `pnpm check-types` | Type-check all packages |
| `pnpm format` | Format with Biome |
| `pnpm test` | Run tests across the monorepo |

## Project structure

```
scrypto/              Radix Scrypto blueprints (Governance + VoteDelegation)
apps/
  vote-collector/     Vote collector — SST serverless (Lambda + Cron) or HTTP server (Hono + Docker)
  consultation/       Vite + React consultation dApp (TanStack Router)
packages/
  database/           Drizzle ORM schema & migrations
  shared/             Shared types and utilities (includes governance config)
```

See [`scrypto/README.md`](scrypto/README.md) for blueprint documentation and deployment guide.
See [`apps/vote-collector/README.md`](apps/vote-collector/README.md) for architecture details, SST configuration, and custom domains.
