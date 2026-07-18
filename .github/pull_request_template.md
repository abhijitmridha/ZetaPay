## Summary

<!-- What does this PR do, and why? -->

## Type of change

- [ ] Frontend (Next.js app under `src/`)
- [ ] Soroban contracts (`contracts/`)
- [ ] ZK circuits (`circuits/`)
- [ ] CI/CD, tooling, or docs
- [ ] Other

## Quality gate checklist

CI enforces these automatically - this checklist is for your own review
before requesting one from a human.

- [ ] `yarn type-check`, `yarn lint:check`, `yarn format:check` pass locally
- [ ] `yarn knip` has no new unused exports/dependencies
- [ ] `yarn build` succeeds
- [ ] If `contracts/**` changed: `yarn lint:rust` and `yarn contracts:test` pass
- [ ] If `circuits/**` changed: circuits still compile (`yarn payroll:compile`, `yarn pool:compile:*`)
- [ ] No secrets, private keys, or `.env` values are committed
- [ ] `deploy/environments/*.env.example` updated if `.env.example` changed

## Screenshots / demo (if UI changed)

<!-- Drag & drop images or a short clip. -->
