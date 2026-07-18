#!/usr/bin/env bash
# Polls the deployed app's /api/health endpoint until it responds 200, or
# fails after a timeout. Used as a post-deploy smoke test gate in the CD
# workflow before a deployment is considered successful.
#
# Usage: health-check.sh <base-url> [max-attempts] [delay-seconds]
set -euo pipefail

base_url="${1:?Usage: health-check.sh <base-url> [max-attempts] [delay-seconds]}"
max_attempts="${2:-10}"
delay_seconds="${3:-6}"
health_url="${base_url%/}/api/health"

echo "==> Health-checking $health_url (max ${max_attempts} attempts, ${delay_seconds}s apart)"

for attempt in $(seq 1 "$max_attempts"); do
  http_status=$(curl -s -o /tmp/health-response.json -w '%{http_code}' "$health_url" || echo "000")

  if [ "$http_status" = "200" ]; then
    echo "Health check passed on attempt $attempt:"
    cat /tmp/health-response.json
    exit 0
  fi

  echo "Attempt $attempt/$max_attempts: got HTTP $http_status, retrying in ${delay_seconds}s..."
  sleep "$delay_seconds"
done

echo "Health check failed after $max_attempts attempts against $health_url" >&2
exit 1
