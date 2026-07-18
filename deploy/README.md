# Deployment Utilities

This directory holds deployment-related configuration and reference material
consumed by `.github/workflows/cd-deploy.yml`. It intentionally contains no
secrets - real values live in [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
as encrypted secrets/variables.

```
deploy/
├── environments/
│   ├── development.env.example   # documents required config for "development"
│   ├── staging.env.example       # documents required config for "staging"
│   └── production.env.example    # documents required config for "production"
└── README.md
```

The actual deploy/rollback/health-check logic lives in `scripts/deploy/` so it
can be invoked identically from CI or a developer's machine:

- `scripts/deploy/deploy.sh <environment>` - builds and deploys to Vercel.
- `scripts/deploy/health-check.sh <url>` - polls `/api/health` post-deploy.
- `scripts/deploy/rollback.sh <environment> [deployment-url]` - rolls back.

Every key in `deploy/environments/*.env.example` must exactly match the keys
in the root `.env.example`. This is enforced by
`scripts/ci/validate-env.mjs`, which runs in CI on every PR so environment
docs can't silently drift from what the app actually reads.

See [`docs/ci-cd/deployment.md`](../docs/ci-cd/deployment.md) for the full
deployment process and [`docs/ci-cd/secrets.md`](../docs/ci-cd/secrets.md)
for the complete list of required GitHub Secrets.
