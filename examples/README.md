# Examples

Sample data to try the vault with:

- [`vault-backup.json`](vault-backup.json) — a tiny vault metadata document
  in the app's persisted shape (`VaultData`, schema v1): three documents
  across two categories, one with a folder path, bound together by a shared
  tag, and one carrying an OCR text sidecar. Useful as a reference for the
  on-disk format the folder/Dropbox backends store as `vault.json`.
- [`receipt-sidecar.txt`](receipt-sidecar.txt) — what an OCR sidecar
  companion file looks like next to a stored scan on a file backend
  (`<blobId>.txt`): the plain recognised text, nothing else.

The JSON shape is validated by the test suite (`tests/`), which exercises
the same modules (`types.ts`, `migrations.ts`) that read this format.
