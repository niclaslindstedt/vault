# Storage backends and encryption

Vault's storage policy in one line: **on this device by default; the cloud
only encrypted.**

## This device (default)

The vault lives in the browser's IndexedDB — the metadata document in one
store, file bytes (scans, PDFs) as Blobs in another. IndexedDB rather than
localStorage because documents are real files: Blob values and hundreds of
MB, not a few kB of strings. Nothing leaves the machine; the app works
fully offline.

## Local folder (desktop only)

Settings → Storage → _Local folder_ stores the vault's metadata document as
a real file (`vault.json`) in a directory you pick — browsable, backed up
by whatever already backs up your disk. Built on the File System Access
API, which only desktop Chromium-family browsers implement; elsewhere the
option is hidden. The granted directory handle persists across reloads.
Unencrypted by design: the folder is your own disk, and the point is files
you can read yourself.

## Dropbox — always encrypted

Settings → Storage → _Dropbox_ syncs the vault to a Dropbox app folder
(`Apps/Vault/`) via a PKCE OAuth flow (no client secret, no account with
us). The cloud copy is **always** wrapped in the framework's AES-GCM
envelope (PBKDF2-derived key):

- Connecting requires an encryption passphrase first — the Connect button
  is disabled without one.
- There is no toggle to store plaintext in the cloud, and no code path that
  could: the Dropbox adapter is only constructible wrapped in
  `withEncryption` (`src/app/backends.ts`).
- The passphrase is held in memory only. A reload locks the cloud copy
  until it is re-entered; the on-device working copy keeps working.
- Losing the passphrase means the cloud copy cannot be read — by anyone.

## What syncs

The device copy is always the working copy; a connected backend mirrors the
metadata document (debounced after each edit, adopted from remote on
connect). Mirroring file bytes as real per-document files (with their
`.txt` sidecar companions) onto the folder/Dropbox backends is the next
step on the roadmap.
