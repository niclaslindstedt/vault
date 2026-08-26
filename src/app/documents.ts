// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Pure helpers over the document collection: creation, updates, filtering and
// ordering. No React, no browser APIs — the store (`useVaultStore`) applies
// these against its state and the tests exercise them directly.

import type { DocumentId, VaultDocument } from "./types.ts";

/** Random-enough id for a document; prefixed so ids stay recognisable in
 *  logs and sidecar file names. */
export function newDocumentId(random: () => number = Math.random): DocumentId {
  const s = () => random().toString(36).slice(2, 10);
  return `doc-${s()}${s()}`.slice(0, 20);
}

export type NewDocument = {
  title: string;
  category: string;
  folder?: string;
  tags?: string[];
  note?: string;
};

/** Build a fresh document. `now` is injected so tests are deterministic. */
export function createDocument(
  input: NewDocument,
  now: string,
  id: DocumentId = newDocumentId(),
): VaultDocument {
  return {
    id,
    title: input.title.trim() || "Untitled",
    category: input.category,
    folder: input.folder ?? "",
    tags: input.tags ?? [],
    note: input.note ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

/** Apply a partial update to one document in the collection, stamping
 *  `updatedAt`. Returns the same array when the id is absent. */
export function withDocumentUpdated(
  docs: readonly VaultDocument[],
  id: DocumentId,
  patch: Partial<Omit<VaultDocument, "id" | "createdAt">>,
  now: string,
): VaultDocument[] {
  if (!docs.some((d) => d.id === id)) return docs as VaultDocument[];
  return docs.map((d) =>
    d.id === id ? { ...d, ...patch, id: d.id, updatedAt: now } : d,
  );
}

/** Remove a document. Returns the same array when the id is absent. */
export function withDocumentRemoved(
  docs: readonly VaultDocument[],
  id: DocumentId,
): VaultDocument[] {
  if (!docs.some((d) => d.id === id)) return docs as VaultDocument[];
  return docs.filter((d) => d.id !== id);
}

/** The list screen's ordering: favourites first, then most recently updated.
 *  Stable for equal keys (sorts a copy — never mutates the input). */
export function sortForList(docs: readonly VaultDocument[]): VaultDocument[] {
  return [...docs].sort((a, b) => {
    if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export type DocumentFilter = {
  /** Category id; undefined = every category. */
  category?: string;
  /** Folder path inside the category (subfolders included); "" = root. */
  folder?: string;
  /** A tag — cross-category, so it applies regardless of `category`. */
  tag?: string;
  /** Include archived documents (default false). */
  archived?: boolean;
};

/** The list screen's filter. Category+folder narrow within the hierarchy;
 *  a tag cuts across it; the two compose (tag within a category). */
export function filterDocuments(
  docs: readonly VaultDocument[],
  filter: DocumentFilter,
): VaultDocument[] {
  return docs.filter((d) => {
    if (!!d.archived !== !!filter.archived) return false;
    if (filter.category !== undefined) {
      if (d.category !== filter.category) return false;
      if (filter.folder !== undefined && filter.folder !== "") {
        if (
          d.folder !== filter.folder &&
          !d.folder.startsWith(`${filter.folder}/`)
        ) {
          return false;
        }
      }
    }
    if (filter.tag !== undefined) {
      const t = filter.tag.toLowerCase();
      if (!d.tags.some((x) => x.toLowerCase() === t)) return false;
    }
    return true;
  });
}
