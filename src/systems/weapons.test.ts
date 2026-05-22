import { describe, expect, it } from "vitest";
import { BASIC_GUN } from "./weapons";

describe("weapons", () => {
  it("tunes the top-down gun for very fast low-damage spray fire", () => {
    expect(BASIC_GUN.damage).toBe(2);
    expect(BASIC_GUN.projectileSpeed).toBeGreaterThanOrEqual(1600);
    expect(BASIC_GUN.attackIntervalMs).toBeLessThanOrEqual(80);
    expect(BASIC_GUN.sparkCount).toBeGreaterThanOrEqual(6);
    expect(BASIC_GUN.recoilDistance).toBeGreaterThanOrEqual(14);
    expect(BASIC_GUN.screenShakeMagnitude).toBeGreaterThanOrEqual(3);
  });
});
