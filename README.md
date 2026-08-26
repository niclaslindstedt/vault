# vault

A local-first document vault PWA built on
[`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework)
— scan receipts and important documents, organise them in categories, folders
and tags, search _inside_ them with built-in on-device OCR, and keep them on
your device — or in Dropbox, always encrypted. Not a password manager: a safe
place for the papers and notes that matter.

[![CI](https://github.com/niclaslindstedt/vault/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/vault/actions/workflows/ci.yml)
[![SEO](https://github.com/niclaslindstedt/vault/actions/workflows/seo.yml/badge.svg)](https://github.com/niclaslindstedt/vault/actions/workflows/seo.yml)
[![Pages](https://github.com/niclaslindstedt/vault/actions/workflows/pages.yml/badge.svg)](https://github.com/niclaslindstedt/vault/actions/workflows/pages.yml)
[![Release](https://github.com/niclaslindstedt/vault/actions/workflows/release.yml/badge.svg)](https://github.com/niclaslindstedt/vault/actions/workflows/release.yml)
[![License: PolyForm-Noncommercial-1.0.0](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](LICENSE)

## Why?

- **Your documents are yours.** Everything lives on your device first — in
  IndexedDB, so real files (scans, PDFs) fit, not just a few kB of strings.
  No account, no server, works fully offline as an installable PWA.
- **Scan the paper, search the pixels.** The built-in receipt/document scanner
  captures paper with the camera; on-device OCR (a WASM Tesseract — no image
  ever leaves the device) writes each scan a _text sidecar_, so full-text
  search finds "espresso machine" inside a photographed receipt.
- **Cloud means encrypted. Always.** Keep the vault on this device (the
  default), store it as real files in a local folder (desktop browsers), or
  sync it to Dropbox — and the cloud copy is _always_ wrapped in an AES-GCM
  envelope keyed by a passphrase that never leaves memory. Turning encryption
  off for cloud storage is not a setting that exists.
- **Organised like paperwork actually is.** Categories (Receipts, Insurance,
  Medical, Tax, …) with folders nested inside them — and tags that bind
  documents _across_ categories and folders ("House move" spans Receipts,
  Legal, and Insurance). A generous glyph catalogue keeps every category
  recognisable at a glance.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+ (CI pins 24 — see `.nvmrc`), npm 10+
- A GitHub personal access token with `read:packages` — the
  `@niclaslindstedt/oss-framework` dependency resolves from GitHub Packages

## Install

The framework dependency comes from the **GitHub Packages** npm registry. The
committed `.npmrc` already points the `@niclaslindstedt` scope there; add your
token to `~/.npmrc` (GitHub Packages requires auth even for public reads):

```
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}
```

Then:

```sh
git clone https://github.com/niclaslindstedt/vault.git
cd vault
npm install
```

## Quick start

```sh
npm run dev
```

Open the printed URL. Tap **New document** to add a note, or **Scan** (on a
device with a camera) to capture a receipt — then **Extract text (OCR)** in
the editor makes the scan searchable.

## Usage

- **Documents** — a document is a note and/or an attached file (image, PDF,
  anything). Rows live in the list screen; the editor covers title, category,
  folder, tags, note, file, and the extracted text.
- **Categories & folders** — pick a category per document and optionally a
  folder path inside it (`Car/Volvo`). Folders are implicit: they exist
  because documents point at them.
- **Tags** — free-form, many per document, suggested from the tags you already
  use. Selecting a tag in the side menu shows every document carrying it,
  across all categories.
- **Search** — the field above the list ranks hits across titles, notes,
  tags, folder paths, and the OCR/extracted sidecar text inside files.
- **Scanner** — the Scan button opens the camera, captures a downscaled JPEG,
  and files it as a document in the active category.
- **Storage** — Settings → Storage: _This device_ (default, never leaves the
  machine), _Local folder_ (desktop; real files you can back up yourself), or
  _Dropbox_ (always encrypted; requires a passphrase before connecting).

### Install as an app

The deployed site is an installable PWA: use your browser's "Install app" /
"Add to Home Screen" affordance. The app works fully offline; when a new
version deploys, an in-app toast offers the update.

## Configuration

All build-time env vars are optional — the app builds and runs with none set.
Copy `.env.example` to `.env` and fill in what you need:

| Variable                  | Effect                                                     |
| ------------------------- | ---------------------------------------------------------- |
| `VITE_DROPBOX_APP_KEY`    | Dropbox PKCE app key; unset hides the Dropbox backend      |
| `VITE_DROPBOX_APP_FOLDER` | Dropbox app-folder name shown in UI copy (default `Vault`) |
| `VITE_BASE`               | Deploy base path (set by CI; default `/`)                  |

See [`docs/configuration.md`](docs/configuration.md) for details.

## Examples

The [`examples/`](examples/) directory holds sample documents to try the
import/scan flow with — see its README.

## Troubleshooting

- **`npm install` fails resolving `@niclaslindstedt/oss-framework`** — your
  GitHub Packages token is missing or lacks `read:packages`; see Install.
- **The Dropbox backend doesn't appear in Settings** — `VITE_DROPBOX_APP_KEY`
  was not set at build time.
- **"Local folder" doesn't appear** — the File System Access API is
  desktop-Chromium only; on mobile the option is hidden by design.

More in [`docs/troubleshooting.md`](docs/troubleshooting.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)
- Feature docs under [`docs/features/`](docs/features/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bugs and feature requests go through
[GitHub Issues](https://github.com/niclaslindstedt/vault/issues); questions
through [Discussions](https://github.com/niclaslindstedt/vault/discussions).
Security reports go through the private channel in
[SECURITY.md](SECURITY.md) — never a public issue.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) © Niclas Lindstedt
