# Consultation & Vote Collector



## Prerequisites

- **Node 22+** (see `engines` in root `package.json`)
- **pnpm** (corepack-managed — `corepack enable` if not already active)
- **AWS credentials** — SST uses the standard credential chain (`AWS_PROFILE`, env vars, etc.). See [SST IAM credentials docs](https://sst.dev/docs/iam-credentials).
- **Docker** (recommended) or a PostgreSQL instance

## Setup

```sh
pnpm install
cp .env.example .env   # then set DATABASE_URL (and optionally NETWORK_ID)
docker compose up -d   # starts Postgres 17 on :5432 (credentials match .env.example defaults)
pnpm db:migrate
```

| Variable       | Description                                   | Default |
| -------------- | --------------------------------------------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string                  | —       |
| `NETWORK_ID`   | Radix network (`1` = mainnet, `2` = stokenet) | `2`     |

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
