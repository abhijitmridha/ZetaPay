# Deployment Process

## Where the app runs

The Next.js app deploys to **Vercel**. `contracts/` and `circuits/` are not
deployed by `cd-deploy.yml` - Soroban contracts are deployed to Stellar
separately via the existing `yarn contracts:deploy*` scripts (see the root
`README.md`), and their compiled WASM is instead attached as a **release
artifact** by `release.yml` (see [`release-process.md`](./release-process.md)).

## Environments

| Environment   | Trigger                                  | Approval required                               | Branch/tag policy              |
| ------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------ |
| `development` | Automatic, after `CI` succeeds on `main` | No                                              | N/A (always the latest `main`) |
| `staging`     | Manual `workflow_dispatch`               | No (unless you add reviewers)                   | `main` or `release/*`          |
| `production`  | Manual `workflow_dispatch`               | **Yes** - GitHub Environment required reviewers | `main` or a `v*` tag           |

Every deploy runs through `cd-deploy.yml`'s `context` job first, which
resolves the target environment/ref and **rejects** any environment/ref
combination outside the table above before anything is built or deployed.

To deploy to staging or production:

1. Go to **Actions -> CD - Deploy -> Run workflow**.
2. Pick the environment and the ref (branch, tag, or commit SHA) to deploy.
3. For `production`, the run pauses at the `deploy` job waiting for approval
   from whoever is configured as a required reviewer on the `production`
   GitHub Environment - approve it from the run's page.

## What a deploy actually does (`scripts/deploy/deploy.sh`)

1. `vercel pull` - fetches that Vercel project's environment-scoped config
   (this is where `NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, Stellar
   network settings, contract IDs, etc. actually come from at deploy time -
   **they live in the Vercel project dashboard, per environment, not in
   GitHub Secrets**; see [`secrets.md`](./secrets.md)).
2. `vercel build` - builds using those pulled settings.
3. `vercel deploy --prebuilt` - deploys the already-built output (avoids a
   second, possibly-different build happening on Vercel's own infra).
4. The resulting URL is written to the job's `url` output, which also
   becomes the environment's URL shown in GitHub's Deployments UI.

Then `cd-deploy.yml` runs `scripts/deploy/health-check.sh <url>`, which polls
`/api/health` (added at `src/app/api/health/route.ts`) up to 10 times, 6
seconds apart, and fails the deploy if it never returns `200`.

## Rollback

If the `deploy` job fails for any reason - including a failed health check -
the `rollback` job runs automatically (`if: failure()`) and calls
`scripts/deploy/rollback.sh <environment>`, which runs `vercel rollback` to
promote the previous successful deployment back to that environment's alias.
Both the deploy and rollback logs are uploaded as workflow artifacts
(30-day retention) so you don't need Vercel dashboard access to see what
happened.

To roll back manually outside of a failed CI run: run `scripts/deploy/
rollback.sh <environment>` locally with `VERCEL_TOKEN`/`VERCEL_ORG_ID`/
`VERCEL_PROJECT_ID` set, or re-run `cd-deploy.yml` via `workflow_dispatch`
pointed at the last-known-good ref.

## Required GitHub repository settings

These cannot be expressed as files in the repo - configure them once in
**Settings**:

1. **Settings -> Environments** - create `development`, `staging`,
   `production`. On `production`, add required reviewers under
   "Deployment protection rules". Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID` as environment secrets on all three (see
   [`secrets.md`](./secrets.md) for whether they're shared or per-environment
   Vercel projects).
2. **Settings -> Branches -> Branch protection rule for `main`**:
   - Require a pull request before merging.
   - Require status checks to pass: **`CI Quality Gate`** and **`Security
Gate`** (the two aggregator jobs - not the individual sub-jobs, so this
     list doesn't need updating every time a job is added/renamed).
   - Require branches to be up to date before merging.
   - Optionally require CodeQL's check too if you want it blocking rather
     than advisory.
3. **Settings -> Code security and analysis** - enable Dependabot alerts and
   security updates (works alongside `.github/dependabot.yml`), and enable
   the CodeQL default setup is **not** needed since this repo ships its own
   `codeql.yml`.
4. **Settings -> Actions -> General -> Workflow permissions** - set to "Read
   repository contents and packages permissions" (the default); individual
   workflows already declare the elevated `permissions:` they need
   (`contents: write` for `release.yml`, `security-events: write` for
   `codeql.yml`, etc.) rather than relying on a broad default.
