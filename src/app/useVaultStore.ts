// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The vault store: the app's working state plus its on-device persistence.
//
// The working copy always lives in IndexedDB (`db.ts`) — that IS the
// "device" backend, and it stays the offline working copy even when a folder
// or Dropbox backend is connected (`useStorage` mirrors the metadata
// document there). Every mutation goes through the pure helpers in
// `documents.ts` / `categories.ts`, so this hook is thin: state, load,
// debounced persist, and the blob plumbing for attached files.

import { useCallback, useEffect, useRef, useState } from "react";

import { categoryIdFor, withCategoryRemoved } from "./categories.ts";
import {
  deleteBlob,
  getBlob,
  putBlob,
  readVaultRaw,
  writeVault,
} from "./db.ts";
import {
  createDocument,
  newDocumentId,
  withDocumentRemoved,
  withDocumentUpdated,
  type NewDocument,
} from "./documents.ts";
import { migrateVault } from "./migrations.ts";
import { status, error as logError } from "../output.ts";
import { makeSidecar } from "./sidecar.ts";
import type {
  Category,
  DocumentFile,
  DocumentId,
  SidecarSource,
  VaultData,
  VaultDocument,
} from "./types.ts";

const PERSIST_DEBOUNCE_MS = 400;

export type VaultStore = {
  /** Null while the first load is in flight. */
  data: VaultData | null;
  loaded: boolean;
  /** Bumped on every mutation — the sync layer watches this. */
  editCount: number;

  addDocument: (input: NewDocument) => VaultDocument;
  updateDocument: (
    id: DocumentId,
    patch: Partial<Omit<VaultDocument, "id" | "createdAt">>,
  ) => void;
  removeDocument: (id: DocumentId) => void;

  /** Store bytes in the blob store and attach the file to the document. */
  attachFile: (
    id: DocumentId,
    blob: Blob,
    meta: { name: string; mime: string; scanned?: boolean },
  ) => Promise<DocumentFile>;
  /** Read an attached file's bytes back (undefined when missing). */
  readFile: (file: DocumentFile) => Promise<Blob | undefined>;

  setSidecar: (
    id: DocumentId,
    text: string,
    source: SidecarSource,
    extra?: { engine?: string; lang?: string },
  ) => void;

  addCategory: (name: string, glyph: string, color?: string) => Category;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  removeCategory: (id: string) => void;

  /** Replace the whole vault (adopting a remote copy from a backend). */
  replaceAll: (data: VaultData) => void;
};

export function useVaultStore(): VaultStore {
  const [data, setData] = useState<VaultData | null>(null);
  const [editCount, setEditCount] = useState(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // First load: read, migrate, adopt.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await readVaultRaw();
        const { data: migrated, migrated: didMigrate } = migrateVault(raw);
        if (cancelled) return;
        setData(migrated);
        status(
          didMigrate
            ? `Loaded vault (migrated to v${migrated.version})`
            : `Loaded vault (${migrated.documents.length} documents)`,
        );
        if (didMigrate) void writeVault(migrated);
      } catch (e) {
        logError(`Failed to load vault: ${String(e)}`);
        const { data: fresh } = migrateVault(null);
        if (!cancelled) setData(fresh);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Commit a mutation: update state, bump the edit counter, persist
  // (debounced — a burst of edits writes once).
  const commit = useCallback((next: VaultData) => {
    setData(next);
    setEditCount((n) => n + 1);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void writeVault(next).catch((e) =>
        logError(`Failed to persist vault: ${String(e)}`),
      );
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  // Mutations read the latest state through a ref so callbacks stay stable.
  const dataRef = useRef(data);
  dataRef.current = data;

  const mutate = useCallback(
    (fn: (d: VaultData) => VaultData) => {
      const current = dataRef.current;
      if (!current) return;
      const next = fn(current);
      if (next !== current) commit(next);
    },
    [commit],
  );

  const addDocument = useCallback(
    (input: NewDocument): VaultDocument => {
      const doc = createDocument(input, new Date().toISOString());
      mutate((d) => ({ ...d, documents: [...d.documents, doc] }));
      return doc;
    },
    [mutate],
  );

  const updateDocument = useCallback(
    (
      id: DocumentId,
      patch: Partial<Omit<VaultDocument, "id" | "createdAt">>,
    ) => {
      mutate((d) => ({
        ...d,
        documents: withDocumentUpdated(
          d.documents,
          id,
          patch,
          new Date().toISOString(),
        ),
      }));
    },
    [mutate],
  );

  const removeDocument = useCallback(
    (id: DocumentId) => {
      const doc = dataRef.current?.documents.find((x) => x.id === id);
      mutate((d) => ({
        ...d,
        documents: withDocumentRemoved(d.documents, id),
      }));
      // Bytes go after the metadata forgets them — never before.
      if (doc?.file) {
        void deleteBlob(doc.file.blobId).catch(() => {});
      }
    },
    [mutate],
  );

  const attachFile = useCallback(
    async (
      id: DocumentId,
      blob: Blob,
      meta: { name: string; mime: string; scanned?: boolean },
    ): Promise<DocumentFile> => {
      const previous = dataRef.current?.documents.find(
        (x) => x.id === id,
      )?.file;
      const file: DocumentFile = {
        name: meta.name,
        mime: meta.mime,
        size: blob.size,
        blobId: `blob-${newDocumentId().slice(4)}`,
        scanned: meta.scanned,
      };
      // Bytes land first, then the metadata points at them — a crash between
      // the two leaves an orphan blob (prunable), never a dangling pointer.
      await putBlob(file.blobId, blob);
      updateDocument(id, { file });
      if (previous) void deleteBlob(previous.blobId).catch(() => {});
      return file;
    },
    [updateDocument],
  );

  const readFile = useCallback(
    (file: DocumentFile) => getBlob(file.blobId),
    [],
  );

  const setSidecar = useCallback(
    (
      id: DocumentId,
      text: string,
      source: SidecarSource,
      extra?: { engine?: string; lang?: string },
    ) => {
      updateDocument(id, {
        sidecar: makeSidecar(text, source, new Date().toISOString(), extra),
      });
    },
    [updateDocument],
  );

  const addCategory = useCallback(
    (name: string, glyph: string, color?: string): Category => {
      const current = dataRef.current;
      const category: Category = {
        id: categoryIdFor(name, current?.categories ?? []),
        name: name.trim(),
        glyph,
        color,
      };
      mutate((d) => ({ ...d, categories: [...d.categories, category] }));
      return category;
    },
    [mutate],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<Omit<Category, "id">>) => {
      mutate((d) => ({
        ...d,
        categories: d.categories.map((c) =>
          c.id === id ? { ...c, ...patch, id: c.id } : c,
        ),
      }));
    },
    [mutate],
  );

  const removeCategory = useCallback(
    (id: string) => {
      mutate((d) => {
        if (d.categories.length <= 1) return d;
        const remaining = d.categories.filter((c) => c.id !== id);
        if (remaining.length === d.categories.length) return d;
        const fallback =
          remaining.find((c) => c.id === "other") ?? remaining[0];
        return {
          ...d,
          categories: remaining,
          documents: withCategoryRemoved(d.documents, id, fallback.id),
        };
      });
    },
    [mutate],
  );

  const replaceAll = useCallback(
    (next: VaultData) => {
      commit(next);
    },
    [commit],
  );

  return {
    data,
    loaded: data !== null,
    editCount,
    addDocument,
    updateDocument,
    removeDocument,
    attachFile,
    readFile,
    setSidecar,
    addCategory,
    updateCategory,
    removeCategory,
    replaceAll,
  };
}
