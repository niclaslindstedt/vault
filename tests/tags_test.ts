// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { createDocument } from "../src/app/documents.ts";
import {
  allTags,
  docsWithTag,
  hasTag,
  tagCounts,
  withTagAdded,
  withTagRemoved,
} from "../src/app/tags.ts";
import type { VaultDocument } from "../src/app/types.ts";

const NOW = "2026-01-01T00:00:00.000Z";

function doc(
  category: string,
  tags: string[],
  extra?: Partial<VaultDocument>,
): VaultDocument {
  return { ...createDocument({ title: "x", category, tags }, NOW), ...extra };
}

describe("withTagAdded", () => {
  it("trims and appends", () => {
    expect(withTagAdded([], "  Warranty ")).toEqual(["Warranty"]);
  });

  it("dedupes case-insensitively, returning the same reference", () => {
    const tags = ["Warranty"];
    expect(withTagAdded(tags, "warranty")).toBe(tags);
    expect(withTagAdded(tags, "")).toBe(tags);
  });
});

describe("withTagRemoved", () => {
  it("removes by exact value", () => {
    expect(withTagRemoved(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("hasTag", () => {
  it("matches case-insensitively", () => {
    expect(hasTag(doc("home", ["House Move"]), "house move")).toBe(true);
    expect(hasTag(doc("home", []), "x")).toBe(false);
  });
});

describe("tags bind documents across categories and folders", () => {
  const receipts = doc("receipts", ["House move"]);
  const legal = { ...doc("legal", ["house move"]), folder: "Purchase" };
  const other = doc("tax", ["2025"]);

  it("docsWithTag spans every category", () => {
    expect(docsWithTag([receipts, legal, other], "House move")).toEqual([
      receipts,
      legal,
    ]);
  });

  it("allTags dedupes case-insensitively with first-seen casing, sorted", () => {
    expect(allTags([receipts, legal, other])).toEqual(["2025", "House move"]);
  });

  it("tagCounts counts across the vault, skipping archived", () => {
    const archived = doc("home", ["house move"], { archived: true });
    const counts = tagCounts([receipts, legal, other, archived]);
    expect(counts.get("House move")).toBe(2);
    expect(counts.get("2025")).toBe(1);
  });
});
