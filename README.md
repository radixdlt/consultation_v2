# Consultation & Vote Collector



## Prerequisites

- **Node 22+** (see `engines` in root `package.json`)
- **pnpm** (corepack-managed — `corepack enable` if not already active)
- **AWS credentials** — SST uses the standard credential chain (`AWS_PROFILE`, env vars, etc.). See [SST IAM credentials docs](https://sst.dev/docs/iam-credentials).
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

## Running locally

```sh
pnpm dev   # starts both apps via Turbo
```

Or run each app individually:

### Vote Collector

```sh
pnpm -F vote-collector dev   # → sst dev --stage local
```

This deploys **real AWS infrastructure** (API Gateway, Lambda, Cron) but routes Lambda invocations back to your local machine via the SST Live Lambda proxy.

On first run, SST prints the API Gateway URL (stable per stage). Copy it — you'll need it for the consultation app.

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
> `componentAddress`, `adminBadgeAddress` are currently
> set to `TODO_*` placeholders.

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
apps/
  vote-collector/   SST-powered serverless vote collector (Lambda + Cron + API Gateway)
  consultation/     Vite + React consultation dApp (TanStack Router)
packages/
  database/         Drizzle ORM schema & migrations
  shared/           Shared types and utilities
```

See [`apps/vote-collector/README.md`](apps/vote-collector/README.md) for SST-specific details (deployment, custom domains, stage management).
