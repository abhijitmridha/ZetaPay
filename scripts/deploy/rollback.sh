#!/usr/bin/env bash
# Rolls a Vercel-hosted environment back to its previous deployment.
#
# Usage: rollback.sh <development|staging|production> [deployment-url]
#
# If a deployment URL is provided, that specific deployment is promoted.
# Otherwise Vercel rolls back to the most recent prior deployment for the
# project automatically.
#
# Requires: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
set -euo pipefail

environment="${1:?Usage: rollback.sh <development|staging|production> [deployment-url]}"
target_deployment="${2:-}"

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"

echo "==> Rolling back '$environment' ${target_deployment:+to $target_deployment}"

if [ -n "$target_deployment" ]; then
  npx --yes vercel rollback "$target_deployment" --token="$VERCEL_TOKEN" --yes
else
  npx --yes vercel rollback --token="$VERCEL_TOKEN" --yes
fi

echo "Rollback triggered for $environment. Verify with scripts/deploy/health-check.sh <url>."
