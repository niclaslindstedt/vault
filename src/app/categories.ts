// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Categories and the folders inside them — pure helpers, no React.
//
// A *category* is a top-level drawer with a glyph and an accent; the starter
// set below seeds a new vault (all editable — rename, restyle, delete). A
// *folder* is a slash-separated path a document carries inside its category
// ("Car/Volvo"). Folders are implicit — they exist because documents point at
// them, like key prefixes in an object store — so there is nothing to create
// or delete apart from the documents themselves. Tags (see `tags.ts`) cut
// across both.

import type { Category, VaultDocument } from "./types.ts";

/** The starter categories a fresh vault opens with. Ids are stable slugs so
 *  documents can reference them across renames. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "receipts", name: "Receipts", glyph: "receipt", builtIn: true },
  { id: "insurance", name: "Insurance", glyph: "umbrella", builtIn: true },
  { id: "medical", name: "Medical", glyph: "cross", builtIn: true },
  { id: "finance", name: "Finance", glyph: "landmark", builtIn: true },
  { id: "tax", name: "Tax", glyph: "percent", builtIn: true },
  { id: "home", name: "Home", glyph: "home", builtIn: true },
  { id: "vehicles", name: "Vehicles", glyph: "car", builtIn: true },
  { id: "travel", name: "Travel", glyph: "globe", builtIn: true },
  { id: "legal", name: "Legal", glyph: "scale", builtIn: true },
  { id: "work", name: "Work", glyph: "briefcase", builtIn: true },
  {
    id: "education",
    name: "Education",
    glyph: "graduation-cap",
    builtIn: true,
  },
  { id: "warranties", name: "Warranties", glyph: "wrench", builtIn: true },
  { id: "identity", name: "Identity", glyph: "id-card", builtIn: true },
  { id: "other", name: "Other", glyph: "folder", builtIn: true },
];

/** Slugify a display name into a stable category id; suffixes with a counter
 *  when the slug is already taken. */
export function categoryIdFor(name: string, existing: Category[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category";
  const taken = new Set(existing.map((c) => c.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Normalise a raw folder path: trim each segment, drop empties, join with
 *  "/". "" (category root) stays "". */
export function normalizeFolder(raw: string): string {
  return raw
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("/");
}

/** The path's segments — [] for the category root. */
export function folderSegments(folder: string): string[] {
  return normalizeFolder(folder).split("/").filter(Boolean);
}

/** The parent path of a folder ("" when the folder is a top-level one). */
export function parentFolder(folder: string): string {
  const segs = folderSegments(folder);
  return segs.slice(0, -1).join("/");
}

/** True when `folder` is `ancestor` itself or nested anywhere below it. An
 *  empty ancestor ("", the category root) contains everything. */
export function folderContains(ancestor: string, folder: string): boolean {
  const a = normalizeFolder(ancestor);
  const f = normalizeFolder(folder);
  if (!a) return true;
  return f === a || f.startsWith(`${a}/`);
}

/** Every folder path in use inside a category, including the intermediate
 *  ancestors ("Car/Volvo" implies "Car"), sorted for a stable tree render. */
export function foldersInCategory(
  docs: readonly VaultDocument[],
  category: string,
): string[] {
  const out = new Set<string>();
  for (const d of docs) {
    if (d.category !== category) continue;
    const segs = folderSegments(d.folder);
    for (let i = 1; i <= segs.length; i++) {
      out.add(segs.slice(0, i).join("/"));
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

/** Documents living directly in — or anywhere below — a folder of a
 *  category. Pass folder "" for the whole category. */
export function docsInFolder(
  docs: readonly VaultDocument[],
  category: string,
  folder: string,
): VaultDocument[] {
  return docs.filter(
    (d) => d.category === category && folderContains(folder, d.folder),
  );
}

/** Per-category document counts (archived documents excluded), for the side
 *  menu's badge column. */
export function categoryCounts(
  docs: readonly VaultDocument[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of docs) {
    if (d.archived) continue;
    counts[d.category] = (counts[d.category] ?? 0) + 1;
  }
  return counts;
}

/** Reassign every document of a deleted category to `fallbackId`, so nothing
 *  is orphaned. Returns the same array when nothing referenced the id. */
export function withCategoryRemoved(
  docs: readonly VaultDocument[],
  removedId: string,
  fallbackId: string,
): VaultDocument[] {
  if (!docs.some((d) => d.category === removedId)) {
    return docs as VaultDocument[];
  }
  return docs.map((d) =>
    d.category === removedId ? { ...d, category: fallbackId, folder: "" } : d,
  );
}
