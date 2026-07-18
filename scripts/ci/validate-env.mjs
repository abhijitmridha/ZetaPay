#!/usr/bin/env node
/**
 * Validates environment configuration for CI/CD.
 *
 * 1. Parses `.env.example` to determine the canonical set of required keys.
 * 2. Ensures every `deploy/environments/*.env.example` documents the same
 *    key set, so per-environment docs can't silently drift from the app.
 * 3. If `--check-runtime` is passed, verifies that every key is actually
 *    set (non-empty) in `process.env` - used right before a deploy/build
 *    that depends on real secrets being present.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseEnvKeys(path) {
  const content = readFileSync(path, 'utf8');
  const keys = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function main() {
  const checkRuntime = process.argv.includes('--check-runtime');
  const examplePath = join(rootDir, '.env.example');
  const requiredKeys = new Set(parseEnvKeys(examplePath));

  if (requiredKeys.size === 0) {
    console.error(`No keys found in ${examplePath}`);
    process.exit(1);
  }

  let hasError = false;

  // 1. Cross-check per-environment templates for drift against .env.example.
  const envDir = join(rootDir, 'deploy', 'environments');
  let envFiles = [];
  try {
    envFiles = readdirSync(envDir).filter((f) => f.endsWith('.env.example'));
  } catch {
    console.warn(`No deploy/environments directory found at ${envDir}, skipping drift check.`);
  }

  for (const file of envFiles) {
    const keys = new Set(parseEnvKeys(join(envDir, file)));
    const missing = [...requiredKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !requiredKeys.has(k));

    if (missing.length > 0) {
      hasError = true;
      console.error(`[drift] deploy/environments/${file} is missing keys: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      hasError = true;
      console.error(
        `[drift] deploy/environments/${file} declares undocumented keys: ${extra.join(', ')}`
      );
    }
  }

  // 2. Optionally verify the running environment actually has values set.
  if (checkRuntime) {
    const missingRuntime = [...requiredKeys].filter((k) => !process.env[k]);
    if (missingRuntime.length > 0) {
      hasError = true;
      console.error(
        `[runtime] Missing required environment variables: ${missingRuntime.join(', ')}`
      );
    }
  }

  if (hasError) {
    process.exit(1);
  }

  console.log(
    `Environment configuration OK (${requiredKeys.size} keys checked${
      checkRuntime ? ', runtime values verified' : ''
    }).`
  );
}

main();
