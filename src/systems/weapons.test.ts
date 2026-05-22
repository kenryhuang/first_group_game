import { describe, expect, it } from "vitest";
import { BASIC_GUN } from "./weapons";

describe("weapons", () => {
  it("tunes the top-down gun for very fast low-damage spray fire", () => {
    expect(BASIC_GUN.damage).toBe(2);
    expect(BASIC_GUN.projectileSpeed).toBeGreaterThanOrEqual(1600);
    expect(BASIC_GUN.attackIntervalMs).toBeLessThanOrEqual(80);
  });
});
