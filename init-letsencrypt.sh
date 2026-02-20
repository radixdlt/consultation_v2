#!/bin/bash
# Bootstrap Let's Encrypt certificates for nginx.
# Solves the chicken-and-egg: nginx needs certs to start,
# certbot needs nginx for the HTTP-01 challenge.
#
# Usage:
#   CERTBOT_STAGING=1 bash init-letsencrypt.sh   # staging (recommended first)
#   bash init-letsencrypt.sh                       # production

set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${APP_DOMAIN:?APP_DOMAIN is required}"
: "${API_DOMAIN:?API_DOMAIN is required}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL is required}"
CERTBOT_STAGING="${CERTBOT_STAGING:-0}"

cert_path="./certbot/conf/live/$APP_DOMAIN"
compose="docker compose -f docker-compose.production.yml"

# 1. Skip if real certs already exist
if [ -f "$cert_path/fullchain.pem" ] && [ ! -f "$cert_path/.dummy" ]; then
  echo "Certificates already exist for $APP_DOMAIN. Skipping."
  echo "Delete $cert_path to force re-issue."
  exit 0
fi

echo "### Creating dummy certificate for $APP_DOMAIN ..."
mkdir -p "$cert_path"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$cert_path/privkey.pem" \
  -out "$cert_path/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null
touch "$cert_path/.dummy"

echo "### Starting nginx with dummy certificate ..."
$compose up -d nginx

echo "### Removing dummy certificate ..."
rm -rf "$cert_path"

echo "### Requesting real certificate from Let's Encrypt ..."
staging_arg=""
if [ "$CERTBOT_STAGING" = "1" ]; then
  staging_arg="--staging"
  echo "    (using staging environment)"
fi

$compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  $staging_arg \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$APP_DOMAIN" \
  -d "$API_DOMAIN"

echo "### Reloading nginx with real certificate ..."
$compose exec nginx nginx -s reload

echo ""
echo "Done! Certificates issued for $APP_DOMAIN and $API_DOMAIN."
echo "Run: $compose up -d"
