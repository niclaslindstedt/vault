// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Text sidecars — the searchable text mirror of a non-text document.
//
// A scanned receipt is pixels; a PDF statement is a binary. To make "find the
// receipt with 'espresso machine' on it" work, every document whose file
// isn't text-born carries a *sidecar*: the text content extracted from it —
// by the OCR pipeline (`ocr.ts`) for images/scans, verbatim for text files,
// or typed by hand. Search (`search.ts`) treats sidecar text exactly like
// note text, so looking *inside* documents is just string matching.
//
// When a folder or cloud backend holds real files, the sidecar is also
// written next to the document as `<blobId>.txt` — a plain, human-readable
// companion file — so the extracted text survives outside the app too.

import type { SidecarSource, TextSidecar, VaultDocument } from "./types.ts";

/** MIME types whose bytes ARE text — no sidecar needed, the file itself is
 *  searchable once read. */
const TEXT_MIME = /^text\/|[/+](json|xml|csv|markdown)$/;

/** MIME types the OCR pipeline can read pixels from. */
const OCR_MIME = /^image\//;

/** Does a file of this MIME type want a sidecar to be searchable? Images and
 *  PDFs do; text-born files don't (their text is extracted verbatim instead). */
export function needsSidecar(mime: string): boolean {
  return !TEXT_MIME.test(mime);
}

/** Can the built-in OCR engine produce the sidecar for this MIME type
 *  automatically? (PDFs need rasterising first, so v1 offers manual text or
 *  per-page image OCR for them.) */
export function canOcr(mime: string): boolean {
  return OCR_MIME.test(mime);
}

/** Build a sidecar value. `now` injected for deterministic tests. */
export function makeSidecar(
  text: string,
  source: SidecarSource,
  now: string,
  extra?: { engine?: string; lang?: string },
): TextSidecar {
  return {
    text: normalizeSidecarText(text),
    source,
    engine: extra?.engine,
    lang: extra?.lang,
    updatedAt: now,
  };
}

/** Collapse OCR noise: normalise line endings, strip trailing whitespace,
 *  and squeeze runs of blank lines so the stored text diffs and reads well. */
export function normalizeSidecarText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The searchable text of a document: its note plus its sidecar (when it has
 *  one). This is the one seam search uses to look "inside" files. */
export function searchableText(
  doc: Pick<VaultDocument, "note" | "sidecar">,
): string {
  return [doc.note, doc.sidecar?.text ?? ""].filter(Boolean).join("\n");
}

/** The companion-file name a sidecar is stored under next to real files on a
 *  folder / cloud backend ("<blobId>.txt"). */
export function sidecarFileName(blobId: string): string {
  return `${blobId}.txt`;
}
