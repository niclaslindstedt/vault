# Architecture

Vault is a frontend-only, local-first PWA built on
[`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework).
There is no server: the build output is static files served from GitHub
Pages, and all state is on-device.

## The data model

One JSON metadata document (`VaultData`, `src/app/types.ts`):

```
VaultData
├── categories: Category[]        // glyph + accent + name, stable slug ids
└── documents: VaultDocument[]
    ├── category: CategoryId      // exactly one
    ├── folder: string            // slash path INSIDE the category ("" = root)
    ├── tags: string[]            // cross-category, case-insensitively deduped
    ├── note: string
    ├── file?: DocumentFile       // metadata only; bytes live in the blob store
    └── sidecar?: TextSidecar     // the searchable text of a non-text file
```

Folders are _implicit_ — they exist because documents carry the path, like
key prefixes in an object store. Tags are the cross-cutting axis: categories
and folders partition, tags bind across the partition.

The document is versioned (`version`) and every read passes through the
forward-only migration chain (`src/app/migrations.ts`, running on the
framework's migrator engine).

## Persistence: IndexedDB, deliberately

`src/app/db.ts` — two object stores: `vault` (the metadata document) and
`blobs` (file bytes keyed by `blobId`). IndexedDB rather than localStorage
because a vault stores real files: scans and PDFs need `Blob` values and
far more than localStorage's few MB. `useVaultStore` owns load + debounced
persist and all mutations (delegating the logic to pure modules —
`documents.ts`, `categories.ts`, `tags.ts` — so it stays testable).

## Storage backends

`src/app/backends.ts` + `useStorage.ts`. The device copy is **always** the
working copy; a connected backend is a mirror of the metadata document:

| Backend | Transport                              | Encryption           |
| ------- | -------------------------------------- | -------------------- |
| device  | IndexedDB (no adapter)                 | n/a (never leaves)   |
| folder  | File System Access API (desktop only)  | none — your own disk |
| dropbox | framework Dropbox adapter (PKCE OAuth) | **always** AES-GCM   |

The Dropbox adapter is composed through the framework's `withEncryption`
unconditionally — `backends.ts` exposes no plaintext cloud constructor, so
"encryption off for cloud" is not representable in code, not just hidden in
UI. The passphrase lives in a `PasswordRef` in memory only.

## OCR and sidecars

`src/app/ocr.ts` defines the narrow `OcrEngine` seam; the default engine
lazy-imports `tesseract.js` (WASM Tesseract — recognition runs entirely in
the browser, no image ever leaves the device). The result is normalised and
stored as the document's `TextSidecar` (`sidecar.ts`); `search.ts` indexes
sidecar text alongside titles/notes/tags/folders through the framework's
progressive-query matcher — that is what makes "search inside documents"
one code path.

Text-born files (`text/*`, JSON, CSV, markdown) don't need a sidecar; PDFs
can't be OCR'd directly in v1 (no rasteriser) — their sidecar is manual
text until a PDF pipeline lands.

## The scanner

`src/app/scanner.ts` (constraints, frame grab, downscale — pure parts
tested in node) + `ScanModal.tsx` (preview → capture → confirm). A capture
becomes a JPEG document in the active category, and the editor offers OCR.

## The renderer is Preact

`@preact/preset-vite` aliases `react`/`react-dom` onto `preact/compat`;
`tsconfig.json` `paths` teach `tsc` the same aliasing. App code imports from
`"react"`; the framework's prebuilt chunks resolve to Preact; no React
reaches the bundle.

## PWA

`pwa-plugin.ts` emits a hand-rolled prompt-to-update service worker,
`manifest.webmanifest`, `version.json`, and `precache-manifest.json` at
build time; the framework's `usePwaUpdate` + `UpdateToast` own the update
UX. The cache id derives from the deploy base (`src/app/pwa.ts`) so the
`/vault/` deploy and any sibling channels never fight over a precache.
