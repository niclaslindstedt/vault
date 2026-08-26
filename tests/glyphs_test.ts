// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORY_GLYPH,
  VAULT_GLYPH_NAMES,
  VAULT_GLYPH_PATHS,
  vaultGlyphPath,
} from "../src/app/glyphs.ts";
import { DEFAULT_CATEGORIES } from "../src/app/categories.ts";

describe("glyph catalogue", () => {
  it("offers a generously sized picker set", () => {
    // The vault wants marks for every kind of category; guard against the
    // catalogue shrinking below a useful size.
    expect(VAULT_GLYPH_NAMES.length).toBeGreaterThanOrEqual(50);
  });

  it("every offered glyph is drawable", () => {
    for (const name of VAULT_GLYPH_NAMES) {
      expect(
        VAULT_GLYPH_PATHS[name],
        `missing path for "${name}"`,
      ).toBeTruthy();
    }
  });

  it("offers no duplicate names", () => {
    expect(new Set(VAULT_GLYPH_NAMES).size).toBe(VAULT_GLYPH_NAMES.length);
  });

  it("every glyph is bare inner SVG (no wrapper, no hardcoded stroke)", () => {
    for (const [name, path] of Object.entries(VAULT_GLYPH_PATHS)) {
      expect(path, name).not.toMatch(/<svg/);
      expect(path, name).not.toMatch(/stroke=/);
    }
  });

  it("every default category's glyph resolves", () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(VAULT_GLYPH_PATHS[c.glyph], c.id).toBeTruthy();
    }
  });

  it("falls back to the default mark for unknown names", () => {
    expect(vaultGlyphPath("no-such-glyph")).toBe(
      VAULT_GLYPH_PATHS[DEFAULT_CATEGORY_GLYPH],
    );
    expect(vaultGlyphPath(undefined)).toBe(
      VAULT_GLYPH_PATHS[DEFAULT_CATEGORY_GLYPH],
    );
  });
});
