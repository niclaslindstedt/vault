// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  createDocument,
  filterDocuments,
  newDocumentId,
  sortForList,
  withDocumentRemoved,
  withDocumentUpdated,
} from "../src/app/documents.ts";

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-02-01T00:00:00.000Z";

describe("newDocumentId", () => {
  it("is doc-prefixed and deterministic under an injected RNG", () => {
    let n = 0.123456789;
    const id = newDocumentId(() => n);
    expect(id).toMatch(/^doc-[a-z0-9]+$/);
    expect(id.length).toBeLessThanOrEqual(20);
  });
});

describe("createDocument", () => {
  it("defaults the optional fields and stamps both timestamps", () => {
    const d = createDocument(
      { title: "  Receipt  ", category: "receipts" },
      NOW,
    );
    expect(d.title).toBe("Receipt");
    expect(d.folder).toBe("");
    expect(d.tags).toEqual([]);
    expect(d.note).toBe("");
    expect(d.createdAt).toBe(NOW);
    expect(d.updatedAt).toBe(NOW);
  });

  it("titles a blank document Untitled", () => {
    expect(createDocument({ title: "  ", category: "c" }, NOW).title).toBe(
      "Untitled",
    );
  });
});

describe("withDocumentUpdated", () => {
  it("patches one document and stamps updatedAt", () => {
    const a = createDocument({ title: "a", category: "c" }, NOW);
    const b = createDocument({ title: "b", category: "c" }, NOW);
    const next = withDocumentUpdated([a, b], a.id, { title: "a2" }, LATER);
    expect(next[0].title).toBe("a2");
    expect(next[0].updatedAt).toBe(LATER);
    expect(next[0].createdAt).toBe(NOW);
    expect(next[1]).toEqual(b);
  });

  it("returns the same array for an unknown id", () => {
    const docs = [createDocument({ title: "a", category: "c" }, NOW)];
    expect(withDocumentUpdated(docs, "nope", { title: "x" }, LATER)).toBe(docs);
  });
});

describe("withDocumentRemoved", () => {
  it("removes by id; same array when absent", () => {
    const a = createDocument({ title: "a", category: "c" }, NOW);
    expect(withDocumentRemoved([a], a.id)).toEqual([]);
    const docs = [a];
    expect(withDocumentRemoved(docs, "nope")).toBe(docs);
  });
});

describe("sortForList", () => {
  it("puts favourites first, then most recently updated", () => {
    const old = createDocument({ title: "old", category: "c" }, NOW);
    const fresh = createDocument({ title: "fresh", category: "c" }, LATER);
    const fav = {
      ...createDocument({ title: "fav", category: "c" }, NOW),
      favorite: true,
    };
    const input = [old, fresh, fav];
    expect(sortForList(input).map((d) => d.title)).toEqual([
      "fav",
      "fresh",
      "old",
    ]);
    // Never mutates the input.
    expect(input.map((d) => d.title)).toEqual(["old", "fresh", "fav"]);
  });
});

describe("filterDocuments", () => {
  const receipt = createDocument(
    { title: "r", category: "receipts", tags: ["move"] },
    NOW,
  );
  const legal = createDocument(
    { title: "l", category: "legal", folder: "Purchase/2026", tags: ["move"] },
    NOW,
  );
  const archived = {
    ...createDocument({ title: "z", category: "receipts" }, NOW),
    archived: true,
  };

  it("filters by category and folder subtree", () => {
    expect(
      filterDocuments([receipt, legal], {
        category: "legal",
        folder: "Purchase",
      }),
    ).toEqual([legal]);
    expect(
      filterDocuments([receipt, legal], { category: "legal", folder: "Pur" }),
    ).toEqual([]);
  });

  it("a tag cuts across categories; combined with category it narrows", () => {
    expect(filterDocuments([receipt, legal], { tag: "MOVE" })).toEqual([
      receipt,
      legal,
    ]);
    expect(
      filterDocuments([receipt, legal], { tag: "move", category: "legal" }),
    ).toEqual([legal]);
  });

  it("excludes archived documents unless asked", () => {
    expect(filterDocuments([receipt, archived], {})).toEqual([receipt]);
    expect(filterDocuments([receipt, archived], { archived: true })).toEqual([
      archived,
    ]);
  });
});
