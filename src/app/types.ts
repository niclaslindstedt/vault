// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The vault's data model. Kept pure (no React, no browser APIs) so every
// domain helper over it is unit-testable in node.
//
// Shape of the world:
//   Category  — a top-level drawer ("Receipts", "Insurance", "Medical", …).
//               Carries a glyph + accent so the side menu and the favicon can
//               show where you are.
//   Folder    — a slash-separated path *inside* a category ("Car/Volvo").
//               Folders are implicit: they exist because a document carries
//               the path, exactly like prefixes in an object store.
//   Tag       — free-form text that binds documents ACROSS folders and
//               categories ("2024", "House purchase", "Warranty").
//   Document  — a note and/or a binary file (PDF, image, scan). Non-text
//               files carry a text *sidecar* — OCR'd or manually entered —
//               so search can look inside them.
//
// Metadata (this file's types) lives in the vault document that syncs;
// file *bytes* live in the on-device blob store (IndexedDB — `db.ts`) and,
// when a folder/cloud backend is connected, as real files next to the
// vault document.

/** Where the vault is stored. `device` (IndexedDB, the default) never leaves
 *  the machine; `folder` writes to a user-picked local directory (desktop
 *  browsers only — File System Access API); `dropbox` syncs to a Dropbox app
 *  folder and is ALWAYS encrypted — cloud storage without encryption is not
 *  offered (see `backends.ts`). */
export type StorageChoice = "device" | "folder" | "dropbox";

export type CategoryId = string;
export type DocumentId = string;

export interface Category {
  id: CategoryId;
  name: string;
  /** Glyph name from the app catalogue (`glyphs.ts`). */
  glyph: string;
  /** Accent colour for the glyph/badges (a `GLYPH_COLORS` value). */
  color?: string;
  /** Seeded by the app; kept so a reset can restore the starter set. */
  builtIn?: boolean;
}

/** How the sidecar text came to be. */
export type SidecarSource = "ocr" | "extracted" | "manual";

/** The searchable text mirror of a non-text document. Scanned images and
 *  photographed receipts get one from the OCR pipeline; text-born files
 *  (plain text, markdown) get one extracted verbatim; anything can get one
 *  typed by hand. Search treats sidecar text exactly like note text. */
export interface TextSidecar {
  text: string;
  source: SidecarSource;
  /** Engine identifier for OCR-produced text (e.g. "tesseract.js"). */
  engine?: string;
  /** BCP-47-ish language the OCR ran with (e.g. "eng", "swe"). */
  lang?: string;
  updatedAt: string;
}

/** An attached binary file. The bytes live in the blob store under `blobId`;
 *  this is only the metadata the document carries. */
export interface DocumentFile {
  name: string;
  mime: string;
  size: number;
  blobId: string;
  /** True when the file was captured with the built-in scanner. */
  scanned?: boolean;
}

export interface VaultDocument {
  id: DocumentId;
  title: string;
  category: CategoryId;
  /** Slash-separated folder path inside the category; "" = category root. */
  folder: string;
  /** Cross-category tags (deduped case-insensitively; see `tags.ts`). */
  tags: string[];
  /** Free-text note. A document can be *just* a note — no file attached. */
  note: string;
  file?: DocumentFile;
  sidecar?: TextSidecar;
  favorite?: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The current schema version of the persisted vault document. Bump together
 *  with a new step in `migrations.ts`. */
export const VAULT_SCHEMA_VERSION = 1;

/** The one JSON document a storage backend moves: all metadata, no bytes. */
export interface VaultData {
  version: number;
  categories: Category[];
  documents: VaultDocument[];
}

export function emptyVault(categories: Category[] = []): VaultData {
  return { version: VAULT_SCHEMA_VERSION, categories, documents: [] };
}
