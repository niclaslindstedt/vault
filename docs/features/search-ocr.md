# Search and OCR sidecars

## Sidecars

A scanned receipt is pixels; a PDF is a binary. To make their _contents_
searchable, every non-text document can carry a **text sidecar** — the text
extracted from its file:

- **OCR** — for images and scans, the built-in engine (tesseract.js, a WASM
  Tesseract build) recognises the text entirely on-device; no image ever
  leaves the machine. Run it from the editor's _Extract text (OCR)_ button.
- **Manual** — the sidecar is an editable field, because OCR misreads and
  because some documents (PDFs, in v1) have no automatic path yet.

Sidecar text is normalised (line endings, trailing space, blank-line runs)
and stamped with its source and engine. When a folder or cloud backend holds
real files, the sidecar is intended to live next to the file as a plain
`<blobId>.txt` companion, so the extracted text survives outside the app.

## Search

The search field ranks hits across **titles, tags, folder paths, notes, and
sidecar text** — one corpus, so a hit inside a scanned receipt surfaces
exactly like a hit in a typed note. The matcher is the framework's
progressive engine: plain substring first, then fuzzy, wildcard (`*`), and
regex (`/…/`) forms. Each document appears once, under its strongest field;
archived documents stay out of results except in the Archive view.
