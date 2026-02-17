# Vote Collector

Serverless vote collector for Radix governance, built with [SST v3](https://sst.dev/) and [Effect](https://effect.website/).

## Architecture

- **Cron** (`Poll`): fires every minute, polls the Radix Gateway for new governance transactions, processes events and recalculates votes. Loops until the page is drained (< 100 txs).
- **API** (`Api`): `GET /vote-results` and `GET /account-votes`, backed by API Gateway V2.
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

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `sst:local` | `sst dev --stage local` | Local dev with live Lambda emulation |
| `sst:deploy:dev` | `sst deploy --stage development` | Deploy to development stage |
| `sst:deploy:prod` | `sst deploy --stage production` | Deploy to production stage |
| `sst:destroy:local` | `sst destroy --stage local` | Tear down local stage |
| `sst:destroy:dev` | `sst destroy --stage development` | Tear down development stage |
| `sst:destroy:prod` | `sst destroy --stage production` | Tear down production stage |

Usage: `pnpm sst:local`, `pnpm sst:deploy:dev`, etc.

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
