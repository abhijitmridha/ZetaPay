# Troubleshooting

## Contracts

### `error: failed to run custom build command for 'soroban-sdk'` mentioning `wasm32-unknown-unknown`

```
Rust compiler 1.82+ with target 'wasm32-unknown-unknown' is unsupported by
the Soroban Environment, use 'wasm32v1-none' available with Rust 1.84+.
```

soroban-sdk 26.x refuses `wasm32-unknown-unknown` on modern Rust toolchains
because that target gained `reference-types`/`multi-value` features Soroban
doesn't yet support. Every command in this repo (`yarn lint:rust`,
`ci-contracts.yml`, `.github/actions/setup-rust`) already targets
`wasm32v1-none` for this reason - if you see this error, something is
invoking `cargo` with `--target wasm32-unknown-unknown` directly instead of
going through the existing scripts/workflow.

### `cargo fmt --all -- --check` fails

Run `cargo fmt --all` (no `--check`) locally to auto-fix, then commit. CI
only checks, it never auto-formats for you.

### `cargo clippy ... -D warnings` fails with "too many arguments"

Soroban contract entrypoints (`#[contractimpl]`) often need more than
clippy's default 7-argument threshold because every ABI field is a separate
typed parameter - restructuring into a struct would change the on-chain
function signature. Both `zetapay-payroll` and `zetapay-pool` already carry
a crate-level `#![allow(clippy::too_many_arguments)]` in their `lib.rs` for
this reason. If a **new** crate hits this, add the same allow there rather
than suppressing it per-function (the macro expansion attributes the
warning to the `impl` block, not the individual function, so a
function-level `#[allow(...)]` may not suppress it).

### `cargo check --locked` fails in CI but not locally

Someone changed a `Cargo.toml` dependency without running `cargo build`/
`cargo check` afterward to update `contracts/Cargo.lock`. Run `cd contracts
&& cargo check` locally and commit the resulting `Cargo.lock` diff.

## Frontend

### `yarn knip` reports findings but the CI job still passes

This is intentional and temporary: `knip` was introduced alongside this CI
pipeline, so its first run surfaces the repo's entire pre-existing baseline
of unused files/exports/dependencies (10 unused files, ~35 unused
exports/types, a handful of unused deps as of this writing) - none of which
were introduced by any single PR, so no single PR should be blocked fixing
all of them. `ci-frontend.yml`'s knip step runs with `continue-on-error:
true` until someone triages that baseline (delete what's truly dead, add
`knip.json` ignores for what's intentionally public API surface or
forward-looking code). Once triaged, remove `continue-on-error` so it
becomes a real gate like ESLint/Prettier.

Separately, knip's GitHub Actions plugin scans `.github/workflows/**/*.yml`
`run:` steps for binaries and can report false positives from multi-value
CLI flags containing `;` (e.g. `--failOn "AGPL-1.0;AGPL-3.0;SSPL-1.0"` in
`security.yml` gets misparsed as three separate commands) - these are
noise, not real findings.

### `next build` fails with "X is not set" from a config module

`ci-frontend.yml` sets placeholder values for every key in `.env.example`
via its top-level `env:` block specifically so modules like
`src/lib/supabase/client.ts` (which throw at import time if a var is
missing) don't break the build. If you add a **new** required env var to
`.env.example`, add a placeholder for it in `ci-frontend.yml`'s `env:` block
too, and add it to each `deploy/environments/*.env.example` (see
`scripts/ci/validate-env.mjs`, which will otherwise fail the `quality` job
with a "drift" error listing exactly which environment file is missing it).

### `yarn knip` reports a false positive (a file/export it thinks is unused but isn't)

Knip's Next.js plugin treats `src/app/**/{page,layout,route,...}.tsx` and
`src/proxy.ts` as entrypoints (see `knip.json`). If you add a new kind of
Next.js special file (e.g. a route group convention knip doesn't recognize
automatically) or a script that's only invoked via `package.json` `scripts`,
add it to `knip.json`'s `entry` array rather than sprinkling `// eslint-
disable` style suppressions through application code.

### `yarn install --frozen-lockfile` fails locally but `yarn install` works

`yarn.lock` is out of sync with `package.json` - this is exactly what
`scripts/ci/check-lockfile.sh` is designed to catch. Run plain `yarn
install` to regenerate the lockfile and commit it.

### Local `yarn install` fails with an "engine ... incompatible" error

Yarn classic hard-fails on `engines` mismatches for packages like
`lint-staged` if your local Node patch version is a hair behind what it
requires. This is a local Node version issue, not a repo problem - update
Node (`nvm install --lts` or similar). CI is unaffected because
`actions/setup-node` always installs the latest patch of whichever major
version `.github/actions/setup-node/action.yml` specifies.

## Security workflow

### `yarn audit --level high` fails on a transitive dependency you don't control

Check if a patched version exists (`yarn audit --json`, look at
`patched_versions`) and force it via the root `package.json`'s
`"resolutions"` field, then `yarn install` to regenerate the lockfile - this
is exactly how the pre-existing `underscore`/`ws` advisories (pulled in
transitively through `snarkjs`/`circomlibjs`) were resolved. If no patched
version exists yet, that's a real finding to track, not a CI bug - consider
whether the dependency can be removed/replaced, or accept the risk
explicitly and revisit weekly via `maintenance.yml`'s dependency-audit
report.

### `license-check` fails

It only hard-fails on AGPL/SSPL. If you see it fail, a newly-added
dependency actually is AGPL/SSPL-licensed - this needs a real licensing
decision, not a config tweak. GPL-3.0/LGPL findings are expected (the ZK
proving stack) and only print as informational context.

### `gitleaks detect` flags something in `contracts/**/src/fixtures.rs` or `circuits/**/build/`

These are auto-generated Groth16 proof/verification-key constants and
compiled circuit artifacts, not secrets - `.gitleaks.toml` already
allowlists these paths. If gitleaks flags a **new** path of generated
non-secret material, add it to `.gitleaks.toml`'s `[allowlist].paths`
rather than disabling the rule globally.

## Deployments

### `cd-deploy.yml` fails at "Enforce branch/tag policy per environment"

Production only accepts `main` or a `v*` tag; staging only accepts `main` or
a `release/*` branch. This is intentional (see
[`deployment.md`](./deployment.md)) - deploy from an allowed ref, or if the
policy itself needs to change, edit the `case` statement in `cd-deploy.yml`'s
`context` job.

### `cd-deploy.yml` hangs at the `deploy` job with no logs

If the target environment is `production`, this is very likely expected -
the job is paused waiting for a required reviewer to approve it (GitHub
Environment protection rule). Check the workflow run's page for an
"Approve and deploy" prompt.

### Health check fails after a deploy that otherwise looked fine

`scripts/deploy/health-check.sh` polls `/api/health`
(`src/app/api/health/route.ts`) 10 times, 6 seconds apart. A cold Vercel
function or a slow database connection on first request can exceed that;
bump the `max-attempts`/`delay-seconds` arguments in `cd-deploy.yml`'s
"Post-deploy health check" step if this becomes a recurring false failure.
