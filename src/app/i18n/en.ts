// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The bundled English catalog — also the source of the `Catalog` / message-key
// types every other language must satisfy. Grouped by surface; the runtime
// (`./index.ts`) flattens it to dotted keys (`menu.allDocuments`, …) that
// `t()` resolves.

import type { Widen } from "@niclaslindstedt/oss-framework/i18n";

export const en = {
  common: {
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    add: "Add",
  },
  menu: {
    nav: "Vault",
    allDocuments: "All documents",
    categories: "Categories",
    tags: "Tags",
    archive: "Archive",
    settings: "Settings",
    search: "Search",
    open: "Open menu",
    closeMenu: "Close menu",
  },
  list: {
    empty: "Nothing here yet. Scan a receipt or add a document to begin.",
    addDocument: "New document",
    scan: "Scan",
    searchPlaceholder: "Search titles, notes, tags — and inside documents",
    matchedInside: "matched inside the document text",
    archived: "Archived",
  },
  doc: {
    editTitle: "Document",
    titleLabel: "Title",
    titlePlaceholder: "e.g. Espresso machine receipt",
    categoryLabel: "Category",
    folderLabel: "Folder",
    folderPlaceholder: "e.g. Car/Volvo (optional)",
    tagsLabel: "Tags",
    tagPlaceholder: "Add a tag…",
    noteLabel: "Note",
    notePlaceholder: "Anything worth remembering about this document…",
    fileLabel: "File",
    attachFile: "Attach a file",
    replaceFile: "Replace file",
    runOcr: "Extract text (OCR)",
    ocrRunning: "Reading the document…",
    sidecarLabel: "Extracted text",
    sidecarHint:
      "This text makes the file searchable. Edit it if the OCR misread something.",
    favorite: "Favourite",
    archive: "Archive",
    unarchive: "Unarchive",
    deleteConfirm:
      "Delete this document (and its file)? This cannot be undone.",
  },
  scan: {
    title: "Scan a document",
    capture: "Capture",
    retake: "Retake",
    use: "Use scan",
    unavailable:
      "Camera capture is not available in this browser. Attach a photo instead.",
    starting: "Starting camera…",
  },
  settings: {
    title: "Settings",
    storageHeading: "Storage",
    device: "This device",
    deviceHint:
      "The default. Your vault stays in this browser's storage and never leaves the device.",
    folder: "Local folder",
    folderHint:
      "Store the vault as real files in a folder you pick. Desktop browsers only.",
    folderChoose: "Choose folder…",
    dropbox: "Dropbox",
    dropboxHint:
      "Sync the vault to your Dropbox app folder. Always encrypted — the passphrase never leaves this device, and encryption cannot be turned off for cloud storage.",
    dropboxConnect: "Connect Dropbox",
    disconnect: "Disconnect",
    passphraseLabel: "Encryption passphrase",
    passphrasePlaceholder: "Required for cloud storage",
    passphraseHint:
      "Encrypts your vault before it leaves the device (AES-GCM). If you lose it, the cloud copy cannot be read.",
    logsHeading: "Logs",
    aboutHeading: "About",
  },
} as const;

/** Widen the string literals so other language catalogs type-check against
 *  shapes, not exact English text. */
export type Catalog = Widen<typeof en>;
