# Agent guidance for vault

This file is the single agent-instruction source for this repository.
`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`, and
`.github/copilot-instructions.md` are symlinks to it (OSS_SPEC §7.1).

## OSS Spec conformance

This repository conforms to [`OSS_SPEC.md`](OSS_SPEC.md) (a verbatim copy of
the upstream spec — never hand-edit it; the `sync-oss-spec` flow refreshes
it). When you change repository structure, workflows, or conventions, check
the relevant spec section first, and re-run the validator afterwards:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/niclaslindstedt/oss-spec/main/scripts/validate.sh) .
```

## Build and test commands

```sh
make install     # npm install
make build       # vite build
make test        # vitest run (pure-node domain tests in tests/)
make lint        # eslint . && tsc --noEmit
make fmt         # prettier --write .
make fmt-check   # prettier --check .
make icons       # regenerate PWA icons + og.png from the mark
make check-seo   # build + structural SEO/PWA assertions over dist/
```

Run `make lint && make test && make build` before every push — CI runs
exactly these targets and fails on the first error.

### Dependency install in web sessions

`@niclaslindstedt/oss-framework` resolves from the GitHub Packages registry,
which requires an auth token even for public reads. The committed project
`.npmrc` is token-free; a token must be present in `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<GITHUB_PAT with read:packages>
```

Remote/web sessions expose a token via `GITHUB_PAT` / `GITHUB_TOKEN` env
vars; the `.claude/hooks/session-start.sh` SessionStart hook writes it into
`~/.npmrc` and runs `npm install` automatically.

## Commit and PR conventions

- [Conventional Commits](https://www.conventionalcommits.org/):
  `<type>(<scope>): <summary>`; breaking changes use `<type>!:` or a
  `BREAKING CHANGE:` footer.
- The PR **title** must be conventional-commit format — PRs are
  squash-merged and the title becomes the commit on `main`.
- User-visible changes need a changelog fragment under
  `.changes/unreleased/` (see CONTRIBUTING.md §Development workflow); CI's
  `changeset` job enforces it. `CHANGELOG.md` is machine-written by the
  Release workflow — **never edit it by hand**.

## Architecture summary

A frontend-only, local-first PWA. No server exists: the app is static files
(Vite build) served from GitHub Pages; all state is on-device.

- **Data model** (`src/app/types.ts`): one `VaultData` metadata document —
  categories + documents. A document carries a category id, a slash-separated
  folder path _inside_ that category, cross-cutting tags, a note, optionally
  a file (metadata only — bytes live in the IndexedDB blob store), and
  optionally a text **sidecar** (the OCR'd / extracted / manual text of a
  non-text file) that makes search reach inside files.
- **Persistence** (`src/app/db.ts`): IndexedDB — chosen over localStorage
  deliberately, because scans and PDFs need Blob storage and hundreds of MB.
  `useVaultStore` loads via the migrator (`migrations.ts`) and persists
  debounced.
- **Storage backends** (`src/app/backends.ts`, `useStorage.ts`): the device
  copy is always the working copy. A local-folder backend (File System
  Access API, desktop only) or Dropbox mirrors the metadata document via the
  framework's `StorageAdapter`s. **The Dropbox adapter is unconditionally
  wrapped in `withEncryption`** — a plaintext cloud path is not
  constructible, by design. Do not add one.
- **OCR** (`src/app/ocr.ts`): the `OcrEngine` seam, default implementation
  lazy-imports `tesseract.js` (WASM, fully on-device). Sidecar text is
  normalised (`sidecar.ts`) and searchable (`search.ts`, built on the
  framework matcher).
- **Scanner** (`src/app/scanner.ts`, `ScanModal.tsx`): camera capture →
  downscaled JPEG → new document with the frame attached → editor, where OCR
  is one tap away.
- **UI**: Preact via `preact/compat` (see below); the framework `Sidebar`
  frames the shell; screens/modals live in `src/app/*.tsx`.
- **PWA** (`pwa-plugin.ts`, `src/app/pwa.ts`): a hand-rolled prompt-to-update
  service worker emitted at build time; the framework's `usePwaUpdate` +
  `UpdateToast` drive the update UX.

### The renderer is Preact

`@preact/preset-vite` aliases `react` / `react-dom` onto `preact/compat`, and
`tsconfig.json` `paths` teach `tsc` the same aliasing, so app code imports
from `"react"` and the framework's prebuilt chunks resolve to Preact. Don't
add real React, and don't import from `"preact"` directly in components
(`src/main.tsx` is the one exception — it uses Preact's own `render`).

### Reach for the framework first

Before writing a component, hook, or storage/crypto/search primitive, check
`@niclaslindstedt/oss-framework` — buttons, modals, sidebar, glyphs, search
matcher, storage adapters, encryption, logging, i18n and PWA plumbing all
come from there. The app owns only its domain (documents, categories, tags,
sidecars, OCR, scanner) and its screens.

## Where new code goes

| What                          | Where                                                     |
| ----------------------------- | --------------------------------------------------------- |
| Domain logic (pure, testable) | `src/app/<topic>.ts` + `tests/`                           |
| A new screen or modal         | `src/app/<Name>.tsx`, wired in `App.tsx`                  |
| A new glyph / category mark   | `src/app/glyphs.ts` (`APP_GLYPH_PATHS`)                   |
| A new storage backend         | `src/app/backends.ts` (+ `useStorage`)                    |
| Schema changes                | `types.ts` + a step in `migrations.ts`                    |
| User-facing strings           | `src/app/i18n/en.ts`                                      |
| Diagnostics                   | `src/output.ts` helpers (never bare `console.*`)          |
| Build/deploy behaviour        | `vite.config.ts` / `pwa-plugin.ts` / `.github/workflows/` |
| Release notes                 | `.changes/unreleased/` fragment                           |

## Test conventions

Tests live flat in `tests/` with the `_test` suffix (OSS_SPEC §20.2), run
under vitest's **node** environment — they cover the pure domain modules and
must not need a DOM. Browser-touching modules (`db.ts`, `useStorage.ts`, the
`.tsx` screens) keep their logic thin and delegate to pure helpers so those
stay testable. Run one file: `npx vitest run tests/search_test.ts`. No extra
test dependencies (no jsdom fixtures, no network).

## Source file size

Keep source files under 1000 lines (OSS_SPEC §20.5). Split before you reach
it; the validator enforces it.

## Documentation sync points

| When you change…                | Also update…                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Any user-visible behaviour      | the matching `docs/features/*.md`, `.changes/` fragment                         |
| Setup, build, or env vars       | `README.md`, `docs/getting-started.md`, `docs/configuration.md`, `.env.example` |
| Architecture / storage / schema | `docs/architecture.md`, this file's summary                                     |
| The app mark                    | `public/icons/icon.svg` + `make icons` (never hand-edit the PNGs)               |
| SEO copy / routes               | `index.html`, `public/sitemap.xml`, `public/llms.txt`                           |
| Failure modes users can hit     | `docs/troubleshooting.md`, README Troubleshooting                               |

The app **is** the website (OSS_SPEC §11.2): `pages.yml` deploys the built
app. When user-visible behaviour changes, the SEO copy in `index.html` and
`public/llms.txt` counts as website content — keep it truthful (§11.2's
staleness rule).

## Parity / cross-cutting rules

- Every category glyph offered by the picker must resolve in
  `VAULT_GLYPH_PATHS` (tested in `tests/glyphs_test.ts`).
- The icon PNGs, `favicon.ico`, and `og.png` are generated — change the mark
  in `scripts/generate-icons.mjs` + `public/icons/icon.svg` and run
  `make icons`; a clean `git diff` after rerunning is the parity check.
- `pwa-plugin.ts` and `src/app/pwa.ts` must agree on the cache id
  (`cacheIdForBase`).
- Cloud storage is always encrypted: any new cloud backend must be composed
  through `withEncryption` inside `backends.ts`, like Dropbox is.

## Maintenance skills

Skills live under `.agent/skills/` (`.claude/skills` symlinks there). Run
order for a full pass: `sync-oss-spec` → `update-docs` → `update-readme`.

| Skill                         | When it runs                                          |
| ----------------------------- | ----------------------------------------------------- |
| `.agent/skills/maintenance`   | Registry + run order for every update skill           |
| `.agent/skills/sync-oss-spec` | Refreshing the vendored `OSS_SPEC.md` + re-validating |
| `.agent/skills/update-docs`   | After behaviour changes touching `docs/`              |
| `.agent/skills/update-readme` | After setup/feature changes touching `README.md`      |
