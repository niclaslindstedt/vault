// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Free-form tags on a document — many per document, each any text ("2024",
// "House purchase", "Warranty"). Tags are the cross-cutting axis of the vault:
// where categories and folders *partition* documents, a tag *binds* them
// across every category and folder ("everything about the house move" spans
// Receipts, Legal, and Insurance). The edit form is a chip list with a text
// field that suggests (typeahead) the tags already used across the vault, but
// never limits you to them. These are the pure helpers behind that field, the
// read view, and the side menu's tag list.

import type { VaultDocument } from "./types.ts";

/** Add a tag to a list — trimmed, and deduped case-insensitively (the
 *  first-seen casing wins). A blank or already-present tag leaves the list
 *  unchanged, returning the *same* array reference so a caller can skip the
 *  no-op commit with a simple identity check. */
export function withTagAdded(tags: readonly string[], raw: string): string[] {
  const v = raw.trim();
  if (!v) return tags as string[];
  if (tags.some((x) => x.toLowerCase() === v.toLowerCase())) {
    return tags as string[];
  }
  return [...tags, v];
}

/** Remove a tag by exact value. */
export function withTagRemoved(tags: readonly string[], tag: string): string[] {
  return tags.filter((x) => x !== tag);
}

/** True when the document carries the tag (case-insensitive). */
export function hasTag(doc: Pick<VaultDocument, "tags">, tag: string): boolean {
  const t = tag.toLowerCase();
  return doc.tags.some((x) => x.toLowerCase() === t);
}

/** The distinct tags used across the vault, deduped case-insensitively (the
 *  first-seen casing wins) and sorted — the typeahead suggestions the tag
 *  field offers and the side menu's tag list. */
export function allTags(docs: readonly VaultDocument[]): string[] {
  const seen = new Map<string, string>();
  for (const d of docs) {
    for (const t of d.tags) {
      const k = t.toLowerCase();
      if (!seen.has(k)) seen.set(k, t);
    }
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/** Every document carrying the tag, across all categories and folders —
 *  the cross-cutting "smart folder" view a tag opens. */
export function docsWithTag(
  docs: readonly VaultDocument[],
  tag: string,
): VaultDocument[] {
  return docs.filter((d) => hasTag(d, tag));
}

/** Per-tag document counts (case-insensitive, keyed by first-seen casing),
 *  for the side menu's badge column. */
export function tagCounts(docs: readonly VaultDocument[]): Map<string, number> {
  const casing = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const d of docs) {
    if (d.archived) continue;
    for (const t of d.tags) {
      const k = t.toLowerCase();
      const label = casing.get(k) ?? t;
      casing.set(k, label);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return counts;
}
