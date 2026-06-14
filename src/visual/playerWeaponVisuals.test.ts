import { describe, expect, it } from "vitest";
import { PLAYER_WEAPON_VISUAL_GEOMETRY } from "./playerWeaponVisuals";

describe("player weapon visuals", () => {
  it("keeps the weapon compact enough to reveal the redrawn story character", () => {
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.width).toBeLessThanOrEqual(34);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.height).toBeLessThanOrEqual(10);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.tipX).toBeLessThanOrEqual(56);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.circleRadius).toBeLessThanOrEqual(5);
  });
});
