# Configuration

All configuration is **build-time** environment (Vite `import.meta.env`);
the app has no server and no runtime config files. Everything is optional —
the app builds and runs with nothing set. For local overrides copy
`.env.example` to `.env` (git-ignored).

## Variables

### `VITE_DROPBOX_APP_KEY`

The Dropbox OAuth app key (a PKCE _public_ client — there is no secret).
Unset, the Dropbox backend is hidden from Settings → Storage entirely.

Create one at <https://www.dropbox.com/developers/apps> with **scoped
access** and the **App folder** permission model, and add your deploy URL
(and `http://localhost:5173` for dev) as OAuth redirect URIs.

In CI the value is injected from the `VITE_DROPBOX_APP_KEY` repository
variable (see `.github/workflows/pages.yml`).

### `VITE_DROPBOX_APP_FOLDER`

The app-folder name Dropbox creates (`Apps/<name>/`), fixed by your Dropbox
app configuration. Only used for UI copy ("stored in Apps/Vault"). Defaults
to `Vault`.

### `VITE_BASE`

The deploy base path; local dev and preview default to `/`. The site is
served from the custom domain (`vault.niclaslindstedt.se`); each release
channel builds at its own base: `/` (release), `/preview/` (main),
`/branch/` (the on-demand branch slot). Drives asset URLs, the
service-worker scope, and the precache cache id (see `src/app/pwa.ts`).

### `VITE_PWA_IGNORE_PATHS`

Comma-separated absolute paths the service worker must **disown** — the
sibling channels nested under this build's base. Only the root release sets
it (`/preview/,/branch/`); its worker's scope `/` is a prefix of the
siblings, so without this it would serve the released shell in place of a
preview/branch page. Unset by default.

## Release channels

The app deploys to three coexisting channels on the custom domain
(`vault.niclaslindstedt.se`). All three are built by `pages.yml` into a
single GitHub Pages artifact (`actions/upload-pages-artifact` →
`actions/deploy-pages`), with each channel merged in at its own subpath:

| Channel | Trigger                                          | Path        | Workflow                    |
| ------- | ------------------------------------------------ | ----------- | --------------------------- |
| release | `release.yml` dispatch (chains into `pages.yml`) | `/`         | `release.yml` → `pages.yml` |
| preview | every commit on `main`                           | `/preview/` | `pages.yml`                 |
| branch  | `pages.yml` dispatch with a `branch_ref`         | `/branch/`  | `pages.yml`                 |

The production `/` build comes from the highest `v*` tag (empty until the
first release, when `main` is served at `/` instead). The `/preview/` build
is the current `main`. The `/branch/` slot is a single, on-demand slot:
dispatch `pages.yml` with a `branch_ref` to park a branch there, and it
persists across later deploys via the auto-managed `branch-deploy` orphan
branch until the next dispatch overwrites it.

Because the channels share one origin, each build gets its own base path
(so its service-worker scope and precache cache id are unique) and the root
release lists its siblings in `VITE_PWA_IGNORE_PATHS` so its worker disowns
their pages. Only the root artifact carries the domain's `CNAME` (from
`public/`); the per-slot copies strip it so a single root file owns the
domain.

## App settings (runtime, per device)

Settings inside the app (storage choice, OCR language, developer mode) are
per-device and persisted in `localStorage` under `vault:settings`. The
Dropbox tokens live in `localStorage`; the folder handle in IndexedDB; the
encryption passphrase **only in memory** — a reload locks the vault until
it is re-entered.
