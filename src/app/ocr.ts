// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The OCR seam. The app depends on the narrow `OcrEngine` interface; the
// default implementation lazy-loads `tesseract.js` (a WASM Tesseract build
// that runs entirely in the browser — no image ever leaves the device, which
// is the whole point of a privacy-first vault). The dynamic import keeps the
// engine out of the main bundle: the ~2 MB of worker + wasm only loads the
// first time a scan or an image actually asks for text.
//
// Consumers hand an image `Blob` in and get plain text back; `sidecar.ts`
// wraps that text into the document's searchable sidecar.

import { status, warn } from "../output.ts";

export type OcrProgress = {
  /** 0..1 across the whole recognition run. */
  progress: number;
  /** The engine's current stage ("loading language", "recognizing text"). */
  stage: string;
};

export interface OcrEngine {
  /** Engine identifier recorded on the sidecar (`sidecar.engine`). */
  readonly id: string;
  recognize(
    image: Blob,
    opts?: { lang?: string; onProgress?: (p: OcrProgress) => void },
  ): Promise<string>;
}

/** Default OCR language (Tesseract traineddata id). */
export const DEFAULT_OCR_LANG = "eng";

/** The tesseract.js-backed engine. Workers are created per call and torn
 *  down after — recognition is rare (once per captured document), so keeping
 *  a worker warm isn't worth its memory. */
export function createTesseractEngine(): OcrEngine {
  return {
    id: "tesseract.js",
    async recognize(image, opts) {
      const lang = opts?.lang ?? DEFAULT_OCR_LANG;
      status(`OCR: loading engine (${lang})`);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, undefined, {
        logger: (m: { status: string; progress: number }) => {
          opts?.onProgress?.({ progress: m.progress, stage: m.status });
        },
      });
      try {
        const result = await worker.recognize(image);
        status("OCR: recognition finished");
        return result.data.text;
      } finally {
        await worker.terminate().catch(() => {
          warn("OCR: worker did not terminate cleanly");
        });
      }
    },
  };
}

// The app-wide engine instance. A test can swap it via `setOcrEngine`.
let engine: OcrEngine = createTesseractEngine();

export function ocrEngine(): OcrEngine {
  return engine;
}

export function setOcrEngine(next: OcrEngine): void {
  engine = next;
}
