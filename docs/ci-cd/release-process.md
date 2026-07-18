# Release Process

Releases are driven by [release-please](https://github.com/googleapis/release-please)
reading [Conventional Commits](https://www.conventionalcommits.org/) off
`main`. There is no manual version bumping.

## Day to day

Write commit messages (or squash-merge PR titles, which is what actually
lands on `main`) using the Conventional Commits format:

- `feat: ...` -> minor version bump, "Features" changelog section
- `fix: ...` -> patch version bump, "Bug Fixes" changelog section
- `perf: ...`, `security: ...`, `deps: ...` -> patch bump, their own sections
- `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `build:` -> no version
  bump, hidden from the changelog (still recorded in git history)
- `feat!: ...` or a `BREAKING CHANGE:` footer -> major version bump

## What happens automatically

1. Every push to `main` runs `release.yml`'s `release-please` job.
2. release-please maintains a single standing PR titled something like
   `chore(main): release 0.2.0` that accumulates all unreleased commits,
   bumping `package.json`'s `version` and updating `CHANGELOG.md`. It
   updates this PR on every push instead of opening a new one.
3. **Merging that PR** is what actually cuts the release: release-please
   tags the merge commit (e.g. `v0.2.0`), creates a GitHub Release with the
   changelog section as its body, and the job's `release_created` output
   flips to `true`.
4. That triggers `attach-release-artifacts`: it checks out the new tag,
   builds the three Soroban contracts (`stellar contract build`), generates
   a `SHA256SUMS.txt`, and uploads both the `.wasm` files and the checksum
   file onto the GitHub Release via `softprops/action-gh-release`.

## Versioning scope

Only the root `package.json` version is bumped by release-please - it's the
single version number for the whole app+contracts+circuits release train.
`contracts/*/Cargo.toml` versions are **not** auto-bumped; they stay at
whatever the crate authors set, since these crates are workspace-internal
path dependencies (never published to crates.io) and tying their version to
release-please would require regenerating `contracts/Cargo.lock` inside the
release PR to avoid breaking `ci-contracts.yml`'s `cargo check --locked`
step. If these crates are ever published independently, revisit
`release-please-config.json`'s `packages` map to add them as their own
release-please components.

## Manual release artifacts

If you need to re-attach artifacts to an existing release (e.g. the first
run failed), re-run `release.yml` via `workflow_dispatch` - `release-please`
will report `release_created: false` for an already-released tag, so
`attach-release-artifacts` won't fire automatically; instead build locally
with `yarn contracts:build` and use `gh release upload <tag> <files>`.
