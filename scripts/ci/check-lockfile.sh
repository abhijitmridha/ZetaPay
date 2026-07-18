#!/usr/bin/env bash
# Fails if yarn.lock is out of sync with package.json. Run in CI right after
# checkout, before relying on a cached install. The Rust equivalent
# (contracts/Cargo.lock) is checked separately in ci-contracts.yml via
# `cargo check --locked`, since it needs the Rust toolchain rather than Node.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "==> Checking yarn.lock is in sync with package.json"
yarn install --frozen-lockfile --prefer-offline --check-files
echo "yarn.lock OK"
