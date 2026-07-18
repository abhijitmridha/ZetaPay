# Required GitHub Secrets & Variables

## Repository-level secrets (Settings -> Secrets and variables -> Actions)

None of the CI workflows (`ci.yml`, `security.yml`, `codeql.yml`) require
any secrets - they build/lint/test with placeholder values and public
tooling only. This is intentional: a fork or external contributor's PR runs
the full quality/security gate without needing access to any credentials.

| Secret         | Used by       | Required? | Notes                                                      |
| -------------- | ------------- | --------- | ---------------------------------------------------------- |
| `GITHUB_TOKEN` | all workflows | Automatic | Provided by GitHub Actions itself, do not create manually. |

## Environment secrets (per GitHub Environment: `development`, `staging`, `production`)

Configured under **Settings -> Environments -> \<environment\> -> Environment
secrets**. These are the only secrets `cd-deploy.yml` and `release.yml`'s
artifact-attachment job need:

| Secret              | Purpose                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel API token (Vercel dashboard -> Account Settings -> Tokens) used by `scripts/deploy/deploy.sh` and `rollback.sh`.                                                                                                                                  |
| `VERCEL_ORG_ID`     | Vercel team/org id (`vercel project ls` or the Vercel project's `.vercel/project.json` after linking once locally).                                                                                                                                      |
| `VERCEL_PROJECT_ID` | Vercel project id. If you use **one** Vercel project with Preview/Production environments, this is the same across all three GitHub Environments; if you use **separate** Vercel projects per environment, set a different value per GitHub Environment. |

### Where the app's own runtime config lives

`NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, `TOKEN_ENCRYPTION_KEY`,
`ZETAPAY_*_CONTRACT_ID`, etc. (the full list in `.env.example`) are **not**
GitHub Secrets. They're configured directly in each Vercel project's
Environment Variables (Project Settings -> Environment Variables, scoped to
Production/Preview/Development), because `vercel pull` fetches them at
deploy time - see [`deployment.md`](./deployment.md). Duplicating them into
GitHub Secrets would just be a second place they could drift out of sync.

`deploy/environments/{development,staging,production}.env.example` documents
what each environment's Vercel project needs configured, without containing
real values. `scripts/ci/validate-env.mjs` enforces that these template
files never drift from the keys declared in the root `.env.example`.

## Optional secrets

| Secret              | Used by                         | Why optional                                                                                                                                                                                                                             |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SEMGREP_APP_TOKEN` | `security.yml` (`sast-semgrep`) | Not currently used - the workflow runs `semgrep scan` with public rulesets (`p/default`, `p/typescript`, `p/rust`) that need no login. Add this and switch to `semgrep ci` if you later want findings synced to Semgrep AppSec Platform. |

## Contract deployer credentials

`STELLAR_SOURCE_ACCOUNT` and the Stellar CLI identity it refers to are a
**local/operator concern**, not a CI secret - contract deployment
(`yarn contracts:deploy*`) is run manually by whoever holds the deployer
key, per the root `README.md`. No workflow in `.github/workflows/` deploys
contracts to a live network; `ci-contracts.yml` only builds and tests them,
and `release.yml` only builds them to attach the resulting WASM as a release
artifact.
