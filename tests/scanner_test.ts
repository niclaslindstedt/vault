// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { fitWithin, scanFileName } from "../src/app/scanner.ts";

describe("fitWithin", () => {
  it("never upscales", () => {
    expect(fitWithin(800, 600, 2200)).toEqual({ width: 800, height: 600 });
  });

  it("caps the longest edge and keeps the aspect ratio", () => {
    const { width, height } = fitWithin(4400, 2200, 2200);
    expect(width).toBe(2200);
    expect(height).toBe(1100);
  });

  it("portrait frames cap on height", () => {
    const { width, height } = fitWithin(1000, 4000, 2000);
    expect(height).toBe(2000);
    expect(width).toBe(500);
  });

  it("never collapses a dimension to zero", () => {
    expect(fitWithin(10000, 1, 100).height).toBe(1);
  });
});

describe("scanFileName", () => {
  it("stamps a sortable local timestamp", () => {
    const name = scanFileName(new Date(2026, 0, 5, 9, 7, 3));
    expect(name).toBe("scan-20260105-090703.jpg");
  });
});
