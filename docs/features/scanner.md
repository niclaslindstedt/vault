# The document scanner

The **Scan** button opens the built-in receipt/document scanner: a live
camera preview (the environment-facing camera, at a resolution high enough
for OCR to read receipt type), a capture step, and a confirm step. On _Use
scan_ the frame is downscaled to a storage-friendly JPEG (longest edge
2200px) and filed as a new document in the active category, with the image
attached.

The editor then offers **Extract text (OCR)** — see
[search & OCR sidecars](search-ocr.md) — which is what turns a photographed
receipt into something you can find by its contents.

Scanning requires camera access (`getUserMedia`); on devices without one the
button is hidden and attaching a photo file does the same job.
