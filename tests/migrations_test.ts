// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORIES } from "../src/app/categories.ts";
import { migrateVault } from "../src/app/migrations.ts";
import { VAULT_SCHEMA_VERSION } from "../src/app/types.ts";

describe("migrateVault", () => {
  it("a first run (null) yields a fresh vault seeded with the starter set", () => {
    const { data, migrated } = migrateVault(null);
    expect(migrated).toBe(false);
    expect(data.version).toBe(VAULT_SCHEMA_VERSION);
    expect(data.categories).toEqual(DEFAULT_CATEGORIES);
    expect(data.documents).toEqual([]);
  });

  it("an unversioned pre-schema value is normalised to v1", () => {
    const { data, migrated } = migrateVault({ documents: [] });
    expect(migrated).toBe(true);
    expect(data.version).toBe(VAULT_SCHEMA_VERSION);
    expect(data.categories).toEqual(DEFAULT_CATEGORIES);
  });

  it("a current document passes through untouched", () => {
    const current = {
      version: VAULT_SCHEMA_VERSION,
      categories: [{ id: "c", name: "C", glyph: "folder" }],
      documents: [],
    };
    const { data, migrated } = migrateVault(current);
    expect(migrated).toBe(false);
    expect(data).toEqual(current);
  });

  it("a newer document is refused, not mangled", () => {
    expect(() => migrateVault({ version: VAULT_SCHEMA_VERSION + 1 })).toThrow(
      /newer version/,
    );
  });
});
