// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Full-text search over the vault, built on the framework's progressive-query
// matcher (substring → fuzzy → wildcard → regex). The framework ranks
// strings; the app owns the corpus — and the vault's corpus is what makes
// "search inside documents" work: each document is indexed by its title,
// tags, folder path, note text, AND its sidecar text (the OCR'd / extracted
// content of its file — see `sidecar.ts`). A query hit inside a scanned
// receipt surfaces exactly like a hit in a typed note.

import {
  compileQuery,
  searchItems,
  type RankedMatch,
} from "@niclaslindstedt/oss-framework/search";

import { searchableText } from "./sidecar.ts";
import type { VaultDocument } from "./types.ts";

/** Where inside the document the strongest hit landed — drives the result
 *  row's context line ("matched inside the scanned text"). */
export type SearchField = "title" | "tags" | "folder" | "note" | "sidecar";

export type DocumentHit = {
  doc: VaultDocument;
  field: SearchField;
  /** The matched text of that field (the row clips + highlights it). */
  text: string;
  score: number;
};

/** The text each field contributes to the index. */
export function fieldTexts(
  doc: VaultDocument,
): Array<{ field: SearchField; text: string }> {
  const out: Array<{ field: SearchField; text: string }> = [
    { field: "title", text: doc.title },
  ];
  if (doc.tags.length) out.push({ field: "tags", text: doc.tags.join(" ") });
  if (doc.folder) out.push({ field: "folder", text: doc.folder });
  if (doc.note) out.push({ field: "note", text: doc.note });
  if (doc.sidecar?.text) out.push({ field: "sidecar", text: doc.sidecar.text });
  return out;
}

/** Search the vault. Every field of every document is ranked; a document
 *  surfaces once, under its strongest field. Archived documents are excluded
 *  unless `includeArchived`. */
export function searchDocuments(
  docs: readonly VaultDocument[],
  query: string,
  opts?: { includeArchived?: boolean },
): DocumentHit[] {
  const compiled = compileQuery(query);
  if (compiled.isEmpty || compiled.invalidRegex) return [];

  const candidates = opts?.includeArchived
    ? docs
    : docs.filter((d) => !d.archived);

  const perField: RankedMatch<{
    doc: VaultDocument;
    field: SearchField;
    text: string;
  }>[] = searchItems(
    candidates.flatMap((doc) =>
      fieldTexts(doc).map((f) => ({ doc, field: f.field, text: f.text })),
    ),
    (x) => x.text,
    compiled,
  );

  // Keep each document once, under its highest-ranked field (the list is
  // already sorted by score).
  const seen = new Set<string>();
  const out: DocumentHit[] = [];
  for (const m of perField) {
    if (seen.has(m.item.doc.id)) continue;
    seen.add(m.item.doc.id);
    out.push({
      doc: m.item.doc,
      field: m.item.field,
      text: m.item.text,
      score: m.match.score,
    });
  }
  return out;
}

/** Convenience for callers that only need the ranked documents. */
export function searchDocumentList(
  docs: readonly VaultDocument[],
  query: string,
): VaultDocument[] {
  return searchDocuments(docs, query).map((h) => h.doc);
}

export { searchableText };
