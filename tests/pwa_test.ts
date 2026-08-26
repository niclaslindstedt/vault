// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { cacheIdForBase } from "../src/app/pwa.ts";

describe("cacheIdForBase", () => {
  it("derives one cache id per deploy base", () => {
    expect(cacheIdForBase("/")).toBe("vault");
    expect(cacheIdForBase("/vault/")).toBe("vault-vault");
    expect(cacheIdForBase("/preview/")).toBe("vault-preview");
    expect(cacheIdForBase("/branch/x/")).toBe("vault-branch-x");
  });
});
