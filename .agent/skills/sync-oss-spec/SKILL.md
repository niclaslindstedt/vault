---
name: sync-oss-spec
description: "Use when the vendored OSS_SPEC.md may be behind upstream, or when repo structure changed. Fetches the latest spec, diffs it against the committed copy, and re-validates the repository against every mandate."
---

# Syncing OSS_SPEC.md

**Governing spec sections:** all structural sections (the spec is the source
of truth for repo shape) + §21.5 (this skill is mandated because the
vendored spec is a drift-prone artifact).

The repository vendors a verbatim copy of
[`OSS_SPEC.md`](https://github.com/niclaslindstedt/oss-spec/blob/main/OSS_SPEC.md)
at the repo root. The upstream spec evolves; a stale local copy silently
masks new mandates.

## Tracking mechanism

`.agent/skills/sync-oss-spec/.last-updated` contains the git commit hash
from the last successful run. Empty means "never run" — fall back to the
repository's initial commit.

## Discovery process

1. Fetch the current upstream copy and diff it against the committed one:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/niclaslindstedt/oss-spec/main/OSS_SPEC.md -o OSS_SPEC.md
   git diff -- OSS_SPEC.md
   ```

2. Treat the diff as the spec's changelog: every changed mandate is a
   candidate conformance gap.

3. Run the validator (the bash mirror works without the Rust binary):

   ```sh
   bash <(curl -fsSL https://raw.githubusercontent.com/niclaslindstedt/oss-spec/main/scripts/validate.sh) .
   ```

## Mapping table

| Spec change area               | Repo files to check                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| §2–§8 root documents           | `LICENSE`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AGENTS.md`, `CHANGELOG.md` |
| §9–§10 build / CI / release    | `Makefile`, `.github/workflows/*`                                                                           |
| §11 docs / website / SEO / PWA | `docs/`, `index.html`, `public/`, `pwa-plugin.ts`, `scripts/check-seo.mjs`                                  |
| §15 templates / dependabot     | `.github/`                                                                                                  |
| §20 tests / file size          | `tests/`, oversized `src/` files                                                                            |
| §21 agent skills               | `.agent/skills/*`                                                                                           |

## Update checklist

- [ ] Fetch upstream `OSS_SPEC.md` and read the diff
- [ ] Run the validator; fix every structural violation it reports
- [ ] Walk the diffed spec sections against the mapping table
- [ ] Run `make lint` and `make test`
- [ ] Commit the refreshed spec together with the conformance fixes
- [ ] Write the new baseline:

      git rev-parse HEAD > .agent/skills/sync-oss-spec/.last-updated

## Verification

1. The validator reports "Structural violations: none".
2. `git diff -- OSS_SPEC.md` is empty against the freshly fetched upstream.
3. `.last-updated` carries the new `HEAD`.

## Skill self-improvement

After a run, extend the mapping table with any spec-section → repo-file
relationship you discovered, and record recurring fix patterns here so the
next sweep is faster. Commit the skill edit with the sync.
