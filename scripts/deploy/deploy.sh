#!/usr/bin/env bash
# Deploys the Next.js app to Vercel for a given environment.
#
# Usage: deploy.sh <development|staging|production>
#
# Requires (as env vars, normally injected from GitHub Secrets):
#   VERCEL_TOKEN        - Vercel API token
#   VERCEL_ORG_ID        - Vercel organization/team id
#   VERCEL_PROJECT_ID    - Vercel project id
#
# Writes the resulting deployment URL to $GITHUB_OUTPUT as `url` when running
# inside GitHub Actions, and always prints it to stdout.
set -euo pipefail

environment="${1:?Usage: deploy.sh <development|staging|production>}"

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"

case "$environment" in
  production)
    vercel_env=production
    deploy_flag=--prod
    ;;
  staging|development)
    vercel_env=preview
    deploy_flag=
    ;;
  *)
    echo "Unknown environment: $environment (expected development|staging|production)" >&2
    exit 1
    ;;
esac

echo "==> Pulling Vercel project settings for '$vercel_env'"
npx --yes vercel pull --yes --environment="$vercel_env" --token="$VERCEL_TOKEN"

echo "==> Building project artifacts via Vercel"
# shellcheck disable=SC2086
npx --yes vercel build $deploy_flag --token="$VERCEL_TOKEN"

echo "==> Deploying prebuilt artifacts to Vercel ($environment)"
# shellcheck disable=SC2086
deployment_url=$(npx --yes vercel deploy --prebuilt $deploy_flag --token="$VERCEL_TOKEN")

echo "Deployment URL: $deployment_url"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "url=$deployment_url" >> "$GITHUB_OUTPUT"
fi
