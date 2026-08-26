# Getting started

Vault is a local-first document vault PWA: a safe place for important
documents and notes — receipts, insurance papers, medical records, contracts
— with a built-in scanner and on-device OCR so you can search _inside_ what
you store. It is not a password manager.

## Run it locally

1. **Prerequisites** — Node.js 22+ (CI pins 24, see `.nvmrc`) and npm 10+.
2. **Registry auth** — the `@niclaslindstedt/oss-framework` dependency comes
   from GitHub Packages, which requires a token even for public reads. Add to
   `~/.npmrc`:

   ```
   //npm.pkg.github.com/:_authToken=<a GitHub PAT with read:packages>
   ```

3. **Install and start:**

   ```sh
   npm install
   npm run dev
   ```

4. Open the printed URL.

## First steps in the app

- **Add a note** — _New document_, type a title and a note, pick a category.
- **Scan a receipt** — _Scan_ opens the camera (on devices that have one);
  capture, confirm, and the scan is filed as a document. In the editor, tap
  _Extract text (OCR)_ — the recognised text becomes the document's
  searchable sidecar.
- **Attach a file** — in the editor, _Attach a file_ stores any file (PDF,
  image, …) in the on-device blob store.
- **Organise** — every document has one category (side menu) and optionally
  a folder path inside it (`Car/Volvo`). Tags are free-form and cut across
  categories — select a tag in the side menu to see everything carrying it.
- **Find it again** — the search field ranks hits across titles, notes,
  tags, folder paths, and the extracted text inside files.

## Where your data lives

By default: on this device, in the browser's IndexedDB — nothing leaves the
machine. Settings → Storage offers two more homes; see
[`docs/features/storage.md`](features/storage.md).

## Install as an app

The deployed site is an installable, offline-capable PWA — use the browser's
"Install app" / "Add to Home Screen" affordance. Updates arrive as an in-app
prompt.
