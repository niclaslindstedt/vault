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

The deploy base path. The Pages workflow sets `/vault/` (GitHub project
pages); local dev and preview default to `/`. Drives the service-worker
scope and the precache cache id (see `src/app/pwa.ts`).

## App settings (runtime, per device)

Settings inside the app (storage choice, OCR language, developer mode) are
per-device and persisted in `localStorage` under `vault:settings`. The
Dropbox tokens live in `localStorage`; the folder handle in IndexedDB; the
encryption passphrase **only in memory** — a reload locks the vault until
it is re-entered.
