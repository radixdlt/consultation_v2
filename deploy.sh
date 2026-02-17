#!/usr/bin/env bash
set -euo pipefail

ENV="${1:?Usage: ./scripts/deploy.sh <stokenet|mainnet>}"

case "$ENV" in
  stokenet)
    ENV_FILE=".env.stokenet"
    SST_SCRIPT="sst:deploy:stokenet"
    ;;
  mainnet)
    ENV_FILE=".env.mainnet"
    SST_SCRIPT="sst:deploy:mainnet"
    ;;
  *)
    echo "Unknown environment: $ENV (expected stokenet or mainnet)" >&2
    exit 1
    ;;
esac

# shellcheck source=/dev/null
source "$ENV_FILE"
export DATABASE_URL NETWORK_ID

pnpm turbo run db:migrate
pnpm --filter vote-collector "$SST_SCRIPT"
