#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.development}"
# shellcheck source=/dev/null
source "$ENV_FILE"
export DATABASE_URL NETWORK_ID

pnpm turbo run db:migrate
pnpm --filter vote-collector sst:deploy:dev
