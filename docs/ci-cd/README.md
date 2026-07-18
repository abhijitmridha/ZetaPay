# CI/CD Architecture

ZetaPay's pipeline is split into small, single-purpose GitHub Actions
workflows instead of one monolithic file, so each concern (build/test,
security, deploy, release, upkeep) can change independently and fail
independently.

```
.github/
├── workflows/
│   ├── ci.yml              # orchestrator: path-filter -> ci-frontend/contracts/circuits -> quality gate
│   ├── ci-frontend.yml     # reusable (workflow_call): lint, types, format, dead code, build
│   ├── ci-contracts.yml    # reusable (workflow_call): cargo fmt/clippy/test, stellar contract build
│   ├── ci-circuits.yml     # reusable (workflow_call): circom compile validation
│   ├── security.yml        # dependency audit, secret scan, license check, SAST, security gate
│   ├── codeql.yml          # CodeQL static analysis (own workflow per GitHub convention)
│   ├── cd-deploy.yml       # deploy to Vercel per GitHub Environment, with rollback
│   ├── release.yml         # release-please semver/changelog/tag + contract WASM release artifacts
│   └── maintenance.yml     # weekly stale-issue sweep + full dependency audit report
├── actions/
│   ├── setup-node/         # composite: cached Node + yarn install --frozen-lockfile
│   └── setup-rust/         # composite: cached Rust toolchain + optional Stellar CLI
├── dependabot.yml          # npm, cargo, github-actions update PRs
└── pull_request_template.md

scripts/
├── ci/
│   ├── validate-env.mjs     # cross-checks .env.example against deploy/environments/*
│   └── check-lockfile.sh    # fails if yarn.lock is out of sync with package.json
└── deploy/
    ├── deploy.sh             # builds + deploys to Vercel for a given environment
    ├── health-check.sh       # polls /api/health after a deploy
    └── rollback.sh           # promotes the previous Vercel deployment

deploy/
├── environments/{development,staging,production}.env.example
└── README.md
```

## Why this split

- **`ci.yml` is an orchestrator, not a worker.** It only detects which parts
  of the monorepo changed (via `dorny/paths-filter`) and calls the relevant
  reusable workflow. A docs-only PR never spins up a Rust toolchain; a
  contracts-only PR never runs `next build`.
- **Every reusable CI workflow ends in a "gate" job** (`quality-gate` in
  `ci.yml`, `security-gate` in `security.yml`) that evaluates
  `needs.*.result` and fails if anything besides `success`/`skipped` shows
  up. Branch protection then only has to require these two check names,
  regardless of how many jobs run underneath.
- **CD, release, and maintenance are separate triggers on purpose.** CD reacts
  to CI success; release reacts to pushes to `main` with Conventional
  Commits; maintenance runs on a schedule. Mixing these into `ci.yml` would
  make a single workflow file responsible for build correctness, deployment,
  and versioning all at once.

## Read next

- [`workflows.md`](./workflows.md) - what each workflow does, trigger by trigger.
- [`deployment.md`](./deployment.md) - environments, approvals, rollback.
- [`secrets.md`](./secrets.md) - every GitHub Secret/Environment needed and why.
- [`release-process.md`](./release-process.md) - how a merge becomes a tagged release.
- [`troubleshooting.md`](./troubleshooting.md) - common failure modes and fixes.
