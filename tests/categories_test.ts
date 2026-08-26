// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORIES,
  categoryCounts,
  categoryIdFor,
  docsInFolder,
  folderContains,
  folderSegments,
  foldersInCategory,
  normalizeFolder,
  parentFolder,
  withCategoryRemoved,
} from "../src/app/categories.ts";
import { createDocument } from "../src/app/documents.ts";
import type { VaultDocument } from "../src/app/types.ts";

const NOW = "2026-01-01T00:00:00.000Z";

function doc(
  category: string,
  folder = "",
  extra?: Partial<VaultDocument>,
): VaultDocument {
  return { ...createDocument({ title: "x", category, folder }, NOW), ...extra };
}

describe("default categories", () => {
  it("have unique ids and non-empty names", () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of DEFAULT_CATEGORIES) expect(c.name).toBeTruthy();
  });
});

describe("categoryIdFor", () => {
  it("slugifies and dedupes against existing ids", () => {
    expect(categoryIdFor("My Cars!", [])).toBe("my-cars");
    expect(categoryIdFor("Receipts", DEFAULT_CATEGORIES)).toBe("receipts-2");
  });

  it("never returns an empty slug", () => {
    expect(categoryIdFor("!!!", [])).toBe("category");
  });
});

describe("folder paths", () => {
  it("normalizes messy input", () => {
    expect(normalizeFolder(" Car /  Volvo ")).toBe("Car/Volvo");
    expect(normalizeFolder("//a//b/")).toBe("a/b");
    expect(normalizeFolder("")).toBe("");
  });

  it("splits into segments and finds parents", () => {
    expect(folderSegments("a/b/c")).toEqual(["a", "b", "c"]);
    expect(folderSegments("")).toEqual([]);
    expect(parentFolder("a/b/c")).toBe("a/b");
    expect(parentFolder("a")).toBe("");
  });

  it("containment matches the folder itself and its descendants only", () => {
    expect(folderContains("Car", "Car")).toBe(true);
    expect(folderContains("Car", "Car/Volvo")).toBe(true);
    expect(folderContains("Car", "Carpet")).toBe(false);
    expect(folderContains("", "anything/at/all")).toBe(true);
  });
});

describe("foldersInCategory", () => {
  it("includes implied ancestors, sorted", () => {
    const docs = [doc("home", "Deeds"), doc("home", "Renovation/2024/Kitchen")];
    expect(foldersInCategory(docs, "home")).toEqual([
      "Deeds",
      "Renovation",
      "Renovation/2024",
      "Renovation/2024/Kitchen",
    ]);
  });

  it("ignores other categories", () => {
    expect(foldersInCategory([doc("tax", "2025")], "home")).toEqual([]);
  });
});

describe("docsInFolder", () => {
  it("returns the folder's subtree within one category", () => {
    const a = doc("home", "Car");
    const b = doc("home", "Car/Volvo");
    const c = doc("home", "Boat");
    const d = doc("tax", "Car");
    expect(docsInFolder([a, b, c, d], "home", "Car")).toEqual([a, b]);
    expect(docsInFolder([a, b, c, d], "home", "")).toEqual([a, b, c]);
  });
});

describe("categoryCounts", () => {
  it("counts per category, skipping archived", () => {
    const docs = [doc("home"), doc("home"), doc("tax", "", { archived: true })];
    expect(categoryCounts(docs)).toEqual({ home: 2 });
  });
});

describe("withCategoryRemoved", () => {
  it("reassigns orphans to the fallback and clears their folder", () => {
    const docs = [doc("boats", "Hull"), doc("home", "Deeds")];
    const next = withCategoryRemoved(docs, "boats", "other");
    expect(next[0].category).toBe("other");
    expect(next[0].folder).toBe("");
    expect(next[1]).toBe(docs[1]);
  });

  it("returns the same array when nothing referenced the id", () => {
    const docs = [doc("home")];
    expect(withCategoryRemoved(docs, "boats", "other")).toBe(docs);
  });
});
