// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The storage engine — a deliberately small first cut of the seam the
// contacts reference app grew into a full sync engine. It owns:
//
//   • the connection state for the folder / Dropbox backends (the directory
//     handle via the framework's IndexedDB handle store; the Dropbox tokens
//     in localStorage),
//   • the in-memory passphrase (`PasswordRef`) the mandatory cloud
//     encryption derives its key from,
//   • mirroring: whenever the vault changes and a backend is connected, the
//     metadata document is serialized and saved through the adapter
//     (encrypted, for Dropbox — see `backends.ts`); on connect, an existing
//     remote copy is adopted into the working state.
//
// The device working copy (IndexedDB) stays authoritative for the UI either
// way — a backend is a mirror, so the app works offline and the vault never
// blocks on the network.

import { useCallback, useEffect, useRef, useState } from "react";

import {
  completeDropboxAuth,
  hasPendingDropboxAuth,
  loadDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  ensurePermission,
  startDropboxAuth,
  type DropboxAuth,
  type StorageAdapter,
} from "@niclaslindstedt/oss-framework/storage";
import { isEncryptedEnvelope } from "@niclaslindstedt/oss-framework/encryption";

import {
  DROPBOX_APP_KEY,
  dropboxAdapter,
  folderAdapter,
  type PasswordRef,
} from "./backends.ts";
import { migrateVault } from "./migrations.ts";
import { status, warn, error as logError } from "../output.ts";
import type { StorageChoice, VaultData } from "./types.ts";
import type { VaultStore } from "./useVaultStore.ts";

const DROPBOX_TOKENS_KEY = "vault:dropbox-tokens";
const MIRROR_DEBOUNCE_MS = 1500;

type StoredTokens = { accessToken: string; refreshToken: string | null };

function readTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(DROPBOX_TOKENS_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: StoredTokens | null): void {
  if (tokens) {
    localStorage.setItem(DROPBOX_TOKENS_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(DROPBOX_TOKENS_KEY);
  }
}

export type StorageState = {
  choice: StorageChoice;
  /** Folder backend: is a directory connected (handle present + permitted)? */
  folderConnected: boolean;
  /** Dropbox backend: are tokens present? */
  dropboxConnected: boolean;
  /** Cloud only: is the in-memory passphrase set (vault unlocked)? */
  unlocked: boolean;

  connectFolder: () => Promise<void>;
  disconnectFolder: () => Promise<void>;
  connectDropbox: () => Promise<void>;
  disconnectDropbox: () => void;
  /** Set the cloud passphrase for this session (held in memory only). */
  setPassphrase: (passphrase: string) => void;
};

export function useStorage(
  store: VaultStore,
  choice: StorageChoice,
): StorageState {
  const [folderHandle, setFolderHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [tokens, setTokens] = useState<StoredTokens | null>(readTokens);
  const [unlocked, setUnlocked] = useState(false);

  // The passphrase never touches persistent storage — a reload locks the
  // vault until it is re-entered. `withEncryption` reads it per operation.
  const passwordRef = useRef<string | null>(null) as {
    current: string | null;
  } & PasswordRef;

  // Rehydrate the persisted folder handle (the grant survives reloads; the
  // permission may need a re-request from a user gesture — Settings offers
  // Reconnect via `connectFolder`).
  useEffect(() => {
    void loadDirectoryHandle().then(async (handle) => {
      if (!handle) return;
      const perm = await ensurePermission(handle, false);
      if (perm === "granted") setFolderHandle(handle);
    });
  }, []);

  // Complete a Dropbox OAuth redirect (`?code=`) when one is mid-flight.
  useEffect(() => {
    if (!DROPBOX_APP_KEY || !hasPendingDropboxAuth()) return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    void completeDropboxAuth(DROPBOX_APP_KEY, code)
      .then((result) => {
        setTokens(result);
        writeTokens(result);
        status("Dropbox connected");
        // Drop the ?code from the URL so a reload doesn't replay it.
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState(null, "", url.toString());
      })
      .catch((e) => logError(`Dropbox connect failed: ${String(e)}`));
  }, []);

  // Build the active adapter for the current choice (null for `device`, or
  // while the backend isn't connected / unlocked yet).
  const adapter: StorageAdapter | null = (() => {
    if (choice === "folder" && folderHandle) return folderAdapter(folderHandle);
    if (choice === "dropbox" && tokens && unlocked) {
      const auth: DropboxAuth = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        onAccessTokenRefreshed: (accessToken) => {
          const next = { ...tokens, accessToken };
          setTokens(next);
          writeTokens(next);
        },
      };
      return dropboxAdapter(auth, passwordRef);
    }
    return null;
  })();

  // Adopt-on-connect: when an adapter becomes active, load the remote copy.
  // A remote vault wins over the local one (it is the synced truth); an empty
  // remote gets the local vault pushed instead.
  const adapterKey = adapter
    ? `${choice}:${choice === "dropbox" ? tokens?.accessToken : "folder"}:${unlocked}`
    : "";
  const adoptedRef = useRef("");
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    if (!adapter || !storeRef.current.loaded) return;
    if (adoptedRef.current === adapterKey) return;
    adoptedRef.current = adapterKey;
    void (async () => {
      try {
        const snapshot = await adapter.load();
        if (snapshot && snapshot.text) {
          if (isEncryptedEnvelope(snapshot.text)) {
            // Decryption happens inside the wrapper; reaching here with an
            // envelope means the passphrase was wrong or absent.
            warn("Remote vault is encrypted and could not be read");
            return;
          }
          const { data } = migrateVault(JSON.parse(snapshot.text) as unknown);
          storeRef.current.replaceAll(data);
          status(`Adopted vault from ${adapter.label}`);
        } else {
          const local = storeRef.current.data;
          if (local) {
            await adapter.save(JSON.stringify(local));
            status(`Pushed vault to ${adapter.label}`);
          }
        }
      } catch (e) {
        logError(`Backend load failed: ${String(e)}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapterKey, store.loaded]);

  // Mirror-on-edit: debounce, serialize, save through the adapter.
  const mirrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!adapter || store.editCount === 0) return;
    if (mirrorTimer.current) clearTimeout(mirrorTimer.current);
    const data: VaultData | null = store.data;
    mirrorTimer.current = setTimeout(() => {
      if (!data) return;
      void adapter
        .save(JSON.stringify(data))
        .then(() => status(`Saved vault to ${adapter.label}`))
        .catch((e) => logError(`Backend save failed: ${String(e)}`));
    }, MIRROR_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.editCount]);

  const connectFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) return;
    try {
      const handle = await window.showDirectoryPicker({
        id: "vault",
        mode: "readwrite",
      });
      const perm = await ensurePermission(handle, true);
      if (perm !== "granted") {
        warn("Folder permission was not granted");
        return;
      }
      await saveDirectoryHandle(handle);
      setFolderHandle(handle);
      status("Local folder connected");
    } catch {
      // Picker dismissed — not an error.
    }
  }, []);

  const disconnectFolder = useCallback(async () => {
    await clearDirectoryHandle();
    setFolderHandle(null);
    status("Local folder disconnected");
  }, []);

  const connectDropbox = useCallback(async () => {
    if (!DROPBOX_APP_KEY) return;
    await startDropboxAuth(DROPBOX_APP_KEY);
  }, []);

  const disconnectDropbox = useCallback(() => {
    setTokens(null);
    writeTokens(null);
    passwordRef.current = null;
    setUnlocked(false);
    status("Dropbox disconnected");
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    passwordRef.current = passphrase || null;
    setUnlocked(Boolean(passphrase));
  }, []);

  return {
    choice,
    folderConnected: folderHandle !== null,
    dropboxConnected: tokens !== null,
    unlocked,
    connectFolder,
    disconnectFolder,
    connectDropbox,
    disconnectDropbox,
    setPassphrase,
  };
}
