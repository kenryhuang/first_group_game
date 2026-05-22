import { describe, expect, it } from "vitest";
import { BASIC_GUN } from "./weapons";

describe("weapons", () => {
  it("tunes the top-down gun for fast weak shots with a punchy cadence", () => {
    expect(BASIC_GUN.damage).toBe(14);
    expect(BASIC_GUN.projectileSpeed).toBeGreaterThanOrEqual(1300);
    expect(BASIC_GUN.attackIntervalMs).toBeLessThanOrEqual(400);
  });
});
