// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Storage backends and the app's storage policy.
//
// Three choices (see `StorageChoice` in `types.ts`):
//
//   device   — the default. The vault lives in IndexedDB (`db.ts`) and never
//              leaves the machine. No adapter involved — the store persists
//              straight to the on-device database.
//   folder   — a user-picked local directory (File System Access API), so the
//              vault is real files you can back up yourself. DESKTOP ONLY:
//              mobile browsers don't implement `showDirectoryPicker`, and
//              `folderBackendAvailable()` gates the option out of Settings.
//   dropbox  — a Dropbox app folder. ALWAYS ENCRYPTED: `dropboxAdapter`
//              composes the framework's `withEncryption` wrapper unconditionally
//              — there is no code path that writes plaintext to the cloud, so
//              "turn encryption off" is not a setting that can exist. The
//              passphrase lives only in memory (`PasswordRef`); after a reload
//              the vault is locked until the user re-enters it.
//
// The adapters move the metadata document (`vault.json`) as bytes; the
// serialize / migrate pipeline stays in the store (`useVaultStore`). File
// blobs stay in the on-device blob store in v1 — mirroring them as real
// files (plus `.txt` sidecar companions, see `sidecar.ts`) onto the folder /
// Dropbox backends is the next step and follows the contacts reference app's
// `photoFileStore` pattern.

import {
  withEncryption,
  type PasswordRef,
} from "@niclaslindstedt/oss-framework/encryption";
import {
  createDropboxAdapter,
  createFolderAdapter,
  isFolderBackendAvailable,
  type DropboxAuth,
  type StorageAdapter,
} from "@niclaslindstedt/oss-framework/storage";

import { logStore } from "./log.ts";
import type { StorageChoice } from "./types.ts";

/** The one file a folder / cloud backend holds the metadata in. */
export const VAULT_FILE_NAME = "vault.json";

/** Dropbox app key, injected at build time. Unset hides the Dropbox backend
 *  from Settings → Storage (`availableBackends` below). */
export const DROPBOX_APP_KEY: string | undefined =
  import.meta.env.VITE_DROPBOX_APP_KEY || undefined;

/** The Dropbox app-folder name shown in "stored at" UI copy. */
export const DROPBOX_APP_FOLDER: string =
  import.meta.env.VITE_DROPBOX_APP_FOLDER || "Vault";

/** Local-folder availability — desktop Chromium-family browsers only. */
export function folderBackendAvailable(): boolean {
  return isFolderBackendAvailable();
}

/** The backends this build/browser can offer, in the order Settings lists
 *  them. `device` is always first — it is the default and the working copy. */
export function availableBackends(): StorageChoice[] {
  const out: StorageChoice[] = ["device"];
  if (folderBackendAvailable()) out.push("folder");
  if (DROPBOX_APP_KEY) out.push("dropbox");
  return out;
}

/** Is the choice a cloud backend (and therefore mandatorily encrypted)? */
export function isCloudChoice(choice: StorageChoice): boolean {
  return choice === "dropbox";
}

const adapterLog = logStore.createLogger("storage");

/** The local-folder adapter over a picked (and permission-granted) directory
 *  handle. Unencrypted by design — the folder is the user's own disk and the
 *  point of the backend is files they can read themselves. */
export function folderAdapter(
  handle: FileSystemDirectoryHandle,
): StorageAdapter {
  return createFolderAdapter(handle, {
    fileName: VAULT_FILE_NAME,
    logger: adapterLog,
  });
}

/** The Dropbox adapter — always wrapped in `withEncryption`. The wrapper
 *  encrypts every save against the passphrase in `passwordRef` (AES-GCM,
 *  PBKDF2-derived key) and decrypts every load; cloud storage without
 *  encryption is deliberately not constructible. */
export function dropboxAdapter(
  auth: DropboxAuth,
  passwordRef: PasswordRef,
): StorageAdapter {
  const inner = createDropboxAdapter(auth, {
    fileName: VAULT_FILE_NAME,
    appKey: DROPBOX_APP_KEY,
    logger: adapterLog,
  });
  return withEncryption(inner, passwordRef, { logger: adapterLog });
}

export type { PasswordRef };
