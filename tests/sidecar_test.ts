// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  canOcr,
  makeSidecar,
  needsSidecar,
  normalizeSidecarText,
  searchableText,
  sidecarFileName,
} from "../src/app/sidecar.ts";

const NOW = "2026-01-01T00:00:00.000Z";

describe("needsSidecar", () => {
  it("binary formats want one; text-born files don't", () => {
    expect(needsSidecar("image/jpeg")).toBe(true);
    expect(needsSidecar("application/pdf")).toBe(true);
    expect(needsSidecar("text/plain")).toBe(false);
    expect(needsSidecar("text/markdown")).toBe(false);
    expect(needsSidecar("application/json")).toBe(false);
  });
});

describe("canOcr", () => {
  it("images are OCR-able, PDFs are not (v1)", () => {
    expect(canOcr("image/png")).toBe(true);
    expect(canOcr("image/jpeg")).toBe(true);
    expect(canOcr("application/pdf")).toBe(false);
  });
});

describe("normalizeSidecarText", () => {
  it("normalises line endings, trailing space, and blank-line runs", () => {
    expect(normalizeSidecarText("a  \r\nb\r\r\n\n\n\nc\n")).toBe("a\nb\n\nc");
  });
});

describe("makeSidecar", () => {
  it("records source, engine and timestamp", () => {
    const s = makeSidecar("TOTAL 12.99\n", "ocr", NOW, {
      engine: "tesseract.js",
      lang: "eng",
    });
    expect(s).toEqual({
      text: "TOTAL 12.99",
      source: "ocr",
      engine: "tesseract.js",
      lang: "eng",
      updatedAt: NOW,
    });
  });
});

describe("searchableText", () => {
  it("joins the note and the sidecar so search reads inside files", () => {
    expect(
      searchableText({
        note: "bought at the mall",
        sidecar: makeSidecar("ESPRESSO MACHINE", "ocr", NOW),
      }),
    ).toBe("bought at the mall\nESPRESSO MACHINE");
    expect(searchableText({ note: "", sidecar: undefined })).toBe("");
  });
});

describe("sidecarFileName", () => {
  it("is the blob id with a .txt companion suffix", () => {
    expect(sidecarFileName("blob-abc123")).toBe("blob-abc123.txt");
  });
});
