# Workflow Responsibilities

## `ci.yml` (orchestrator)

**Triggers:** `pull_request` -> `main`, `push` -> `main`, `workflow_dispatch`.

1. `changes` - runs `dorny/paths-filter` to classify the diff into
   `frontend` / `contracts` / `circuits`.
2. `frontend` / `contracts` / `circuits` - each calls its reusable workflow
   (below), but only if the matching path changed **and** this is a PR. On a
   direct push to `main` (or manual dispatch), all three always run, since a
   push to main is what CD deploys from and correctness there matters more
   than saving a few minutes.
3. `quality-gate` - `if: always()`, inspects the three jobs' results and
   fails if any is neither `success` nor `skipped`. **This is the one status
   check to mark required in branch protection.**

## `ci-frontend.yml` (reusable, `workflow_call`)

- `quality` job: `yarn install --frozen-lockfile` (via the lockfile-check
  script), `yarn validate-env` (docs drift), `yarn type-check`, `yarn
lint:check` (ESLint, `--max-warnings=0`), `yarn format:check` (Prettier),
  `yarn knip` (unused exports/files/dependencies).
- `build` job (needs `quality`): `yarn build`, verifies `.next/BUILD_ID` and
  static output exist, uploads the build manifest as an artifact.
- Build-time env vars are **hardcoded CI placeholders** (see the `env:`
  block at the top of the file) - they exist only so modules that read
  `process.env` at import time don't throw. No real secrets are used or
  needed to validate that the app builds.

## `ci-contracts.yml` (reusable, `workflow_call`)

- `lint` job: `cargo check --locked` (Cargo.lock drift), `cargo fmt --all --
--check`, `cargo clippy --workspace --target wasm32v1-none -- -D
warnings`.
- `test` job: matrix over the three crates
  (`zetapay-verifier`/`zetapay-payroll`/`zetapay-pool`), each running `cargo
test -p <crate>` in parallel.
- `build` job (needs `lint`, `test`): `stellar contract build`, then
  verifies each expected `.wasm` file is non-empty and loadable via `stellar
contract info interface`, then uploads the WASM files as artifacts.
- Uses the `wasm32v1-none` target throughout, not `wasm32-unknown-unknown` -
  soroban-sdk 26.x refuses to build for the latter on modern Rust toolchains
  (see [`troubleshooting.md`](./troubleshooting.md)).

## `ci-circuits.yml` (reusable, `workflow_call`)

- Installs the pinned `circom` release binary, then runs the existing
  `yarn payroll:compile` / `yarn pool:compile:deposit` / `yarn
pool:compile:withdraw` scripts and asserts the `.r1cs`/`.wasm` outputs
  exist.
- **Deliberately skips the Groth16 trusted setup** (`yarn *:setup`, `yarn
*:ptau`) - that downloads a multi-hundred-MB Powers-of-Tau file and
  performs a one-time ceremony; it's not something that should re-run on
  every PR. Compilation alone catches the overwhelming majority of
  circuit-breaking changes (bad includes, missing signals, signature
  mismatches).

## `security.yml`

**Triggers:** PR, push to `main`, weekly schedule, manual dispatch.

| Job                 | Tool                                                | Blocks on                                             |
| ------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `dependency-review` | `actions/dependency-review-action`                  | new high/critical-severity deps introduced by the PR  |
| `npm-audit`         | `yarn audit --level high`                           | high/critical npm advisories                          |
| `cargo-audit`       | `cargo-audit` (via `taiki-e/install-action`)        | any RustSec advisory affecting `contracts/Cargo.lock` |
| `license-check`     | `license-checker`                                   | AGPL/SSPL only (see below)                            |
| `secret-scan`       | `gitleaks`                                          | any match not covered by `.gitleaks.toml`'s allowlist |
| `sast-semgrep`      | `semgrep` (`p/default` + `p/typescript` + `p/rust`) | any finding at default severity                       |
| `security-gate`     | -                                                   | aggregates the above, same pattern as `quality-gate`  |

**License policy:** the ZK proving stack (`snarkjs`, `circomlib`,
`circomlibjs`, and their transitive deps like `ffjavascript`) is GPL-3.0 -
that's a load-bearing, upstream choice for this project's core privacy
feature, not something CI should block on. `license-check` prints the full
license summary every run (so GPL/LGPL usage stays visible) but only hard-
fails on AGPL/SSPL, which would impose obligations well beyond what the
existing dependency tree already accepts.

## `codeql.yml`

Standalone per GitHub's own recommended pattern (so results post to the
Security tab independent of other workflows). Analyzes
`javascript-typescript` with the `security-extended` query pack. Rust is not
included - CodeQL's Rust support is not yet GA; add a `rust` entry to the
`matrix.language` list once it is.

## `cd-deploy.yml`

See [`deployment.md`](./deployment.md) for the full process.

## `release.yml`

See [`release-process.md`](./release-process.md).

## `maintenance.yml`

**Triggers:** weekly schedule (Monday 05:00 UTC), manual dispatch.

- `stale` - closes issues/PRs with no activity in 30 days (7-day warning
  first), exempting anything labeled `pinned`/`security`/`do-not-close`.
- `dependency-audit-report` - runs `yarn audit`/`cargo audit` at **all**
  severities (not just high/critical) plus the lockfile/env-doc drift
  checks, and files or updates a single tracking issue
  (`maintenance-report` label) with the results. This is where the
  moderate/low findings that `security.yml` intentionally doesn't block on
  get surfaced instead of silently aging out.
