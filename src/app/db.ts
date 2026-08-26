// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The on-device store — IndexedDB, not localStorage. A vault holds real
// files (scans, PDFs); localStorage tops out at a few MB and stores only
// strings, so the bytes live in IndexedDB where hundreds of MB are fine and
// Blobs are first-class. Two object stores:
//
//   `vault` — the single metadata document (`VaultData`), key "data".
//   `blobs` — file bytes, keyed by `blobId` (see `DocumentFile.blobId`).
//
// This is the *device* backend — the default, nothing leaves the machine.
// The folder / Dropbox backends (see `backends.ts`) sync the same metadata
// document (plus real files) elsewhere; the blob store is always the local
// working copy the UI reads.
//
// Hand-rolled promise wrappers rather than an idb dependency: the surface
// needed is four calls.

const DB_NAME = "vault-db";
const DB_VERSION = 1;
const VAULT_STORE = "vault";
const BLOB_STORE = "blobs";
const VAULT_KEY = "data";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE);
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB error"));
  });
}

async function withStore<T>(
  name: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return requestToPromise(fn(db.transaction(name, mode).objectStore(name)));
}

/** Read the persisted vault metadata (`undefined` on first run). Returned
 *  raw — the caller runs it through the migrator (`migrations.ts`). */
export async function readVaultRaw(): Promise<unknown> {
  return withStore(VAULT_STORE, "readonly", (s) => s.get(VAULT_KEY));
}

/** Persist the vault metadata document. */
export async function writeVault(data: unknown): Promise<void> {
  await withStore(VAULT_STORE, "readwrite", (s) => s.put(data, VAULT_KEY));
}

/** Store file bytes under a blob id. */
export async function putBlob(blobId: string, blob: Blob): Promise<void> {
  await withStore(BLOB_STORE, "readwrite", (s) => s.put(blob, blobId));
}

/** Read file bytes back (`undefined` when absent — e.g. cleared site data). */
export async function getBlob(blobId: string): Promise<Blob | undefined> {
  return withStore(BLOB_STORE, "readonly", (s) => s.get(blobId));
}

/** Drop file bytes (after the owning document forgot them). */
export async function deleteBlob(blobId: string): Promise<void> {
  await withStore(BLOB_STORE, "readwrite", (s) => s.delete(blobId));
}

/** Every stored blob id — for pruning orphans against the document set. */
export async function listBlobIds(): Promise<string[]> {
  const keys = await withStore(BLOB_STORE, "readonly", (s) => s.getAllKeys());
  return keys.map(String);
}
