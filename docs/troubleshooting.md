# Troubleshooting

## Install / build

**`npm install` fails resolving `@niclaslindstedt/oss-framework` (401/404).**
The dependency lives on GitHub Packages, which requires authentication even
for public packages. Put a PAT with `read:packages` in `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<token>
```

**`vite build` fails resolving `@fontsource/...`.** Run `npm install` again —
the framework's theme engine imports the font packages listed in
`package.json`; a partial install leaves them missing.

## In the app

**"Local folder" is missing from Settings → Storage.** The File System
Access API (`showDirectoryPicker`) only exists in desktop Chromium-family
browsers. On mobile and Firefox/Safari the backend is hidden by design —
use the device store or Dropbox.

**"Dropbox" is missing from Settings → Storage.** The build had no
`VITE_DROPBOX_APP_KEY` (see `docs/configuration.md`).

**The Connect Dropbox button is disabled.** Cloud storage requires the
encryption passphrase first — enter one in the field above the button.
This is deliberate: the cloud copy is always encrypted.

**My vault is "locked" after a reload.** The passphrase is held only in
memory. Re-enter it in Settings → Storage to resume syncing; the on-device
copy keeps working regardless.

**OCR produced garbage.** Recognition quality depends on the capture: flat,
well-lit paper at a straight angle. Retake the scan, or fix the text by hand
in the _Extracted text_ field — the sidecar is editable precisely because
OCR misreads.

**The first OCR run takes long.** The engine (tesseract.js WASM + language
data) is downloaded lazily on first use; subsequent runs reuse it.

**Documents vanished after clearing browser data.** The device store _is_
browser storage (IndexedDB). Clearing site data deletes the vault — connect
a folder or Dropbox backend if you need a copy that survives it.

## Development

**Stale content in dev after running `vite preview`.** A previously
installed service worker can keep serving old bytes; the dev entry
unregisters workers automatically — hard-reload once.

**Where are the logs?** Settings → Logs shows the in-app log buffer (every
diagnostic goes through `src/output.ts`).
