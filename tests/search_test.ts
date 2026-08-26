// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { createDocument } from "../src/app/documents.ts";
import { makeSidecar } from "../src/app/sidecar.ts";
import {
  fieldTexts,
  searchDocumentList,
  searchDocuments,
} from "../src/app/search.ts";
import type { VaultDocument } from "../src/app/types.ts";

const NOW = "2026-01-01T00:00:00.000Z";

const receipt: VaultDocument = {
  ...createDocument(
    {
      title: "Kitchen shopping",
      category: "receipts",
      tags: ["warranty"],
      note: "paid by card",
    },
    NOW,
  ),
  sidecar: makeSidecar("ESPRESSO MACHINE DELUXE\nTOTAL 349.00", "ocr", NOW),
};

const passport: VaultDocument = createDocument(
  { title: "Passport", category: "identity", folder: "Family/Kids" },
  NOW,
);

const archived: VaultDocument = {
  ...createDocument(
    { title: "Old espresso receipt", category: "receipts" },
    NOW,
  ),
  archived: true,
};

describe("fieldTexts", () => {
  it("indexes title, tags, folder, note and sidecar", () => {
    expect(fieldTexts(receipt).map((f) => f.field)).toEqual([
      "title",
      "tags",
      "note",
      "sidecar",
    ]);
    expect(fieldTexts(passport).map((f) => f.field)).toEqual([
      "title",
      "folder",
    ]);
  });
});

describe("searchDocuments", () => {
  const docs = [receipt, passport, archived];

  it("finds text INSIDE a document via its OCR sidecar", () => {
    const hits = searchDocuments(docs, "espresso machine");
    expect(hits).toHaveLength(1);
    expect(hits[0].doc.id).toBe(receipt.id);
    expect(hits[0].field).toBe("sidecar");
  });

  it("finds by folder path and by tag", () => {
    expect(searchDocuments(docs, "kids")[0]?.doc.id).toBe(passport.id);
    expect(searchDocuments(docs, "warranty")[0]?.doc.id).toBe(receipt.id);
  });

  it("surfaces a document once, under its strongest field", () => {
    // "kitchen" hits the title; the same document must not repeat for other
    // fields.
    expect(searchDocuments(docs, "kitchen")).toHaveLength(1);
  });

  it("skips archived documents unless asked", () => {
    expect(searchDocuments(docs, "old espresso").map((h) => h.doc.id)).toEqual(
      [],
    );
    expect(
      searchDocuments(docs, "old espresso", { includeArchived: true }).map(
        (h) => h.doc.id,
      ),
    ).toEqual([archived.id]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchDocuments(docs, "   ")).toEqual([]);
  });
});

describe("searchDocumentList", () => {
  it("hands back just the ranked documents", () => {
    expect(searchDocumentList([receipt, passport], "passport")).toEqual([
      passport,
    ]);
  });
});
