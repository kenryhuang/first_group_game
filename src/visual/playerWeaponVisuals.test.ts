import { describe, expect, it } from "vitest";
import {
  PLAYER_WEAPON_BACK_DEPTH_OFFSET,
  PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
  PLAYER_WEAPON_MUZZLE_DISTANCE,
  PLAYER_WEAPON_VISUAL_GEOMETRY,
  getPlayerWeaponDepthOffset,
  getStoryPlayerWeaponPose,
} from "./playerWeaponVisuals";

describe("player weapon visuals", () => {
  it("keeps the weapon compact enough to reveal the redrawn story character", () => {
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.width).toBeLessThanOrEqual(34);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.height).toBeLessThanOrEqual(10);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.tipX).toBeLessThanOrEqual(56);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.circleRadius).toBeLessThanOrEqual(5);
  });

  it("exposes the muzzle distance used by bullets and muzzle sparks", () => {
    expect(PLAYER_WEAPON_MUZZLE_DISTANCE).toBe(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.tipX);
  });

  it("puts the weapon behind the story actor when aiming upward", () => {
    expect(getPlayerWeaponDepthOffset(-Math.PI / 2)).toBe(PLAYER_WEAPON_BACK_DEPTH_OFFSET);
    expect(getPlayerWeaponDepthOffset(-Math.PI / 4)).toBe(PLAYER_WEAPON_BACK_DEPTH_OFFSET);
    expect(getPlayerWeaponDepthOffset(0)).toBe(PLAYER_WEAPON_FRONT_DEPTH_OFFSET);
    expect(getPlayerWeaponDepthOffset(Math.PI / 2)).toBe(PLAYER_WEAPON_FRONT_DEPTH_OFFSET);
  });

  it("uses 2.5d hand anchors and a flatter barrel for front and back aim poses", () => {
    const backAim = Math.atan2(-64, 128);
    const frontAim = Math.atan2(64, -128);
    const sideAim = 0;

    expect(getStoryPlayerWeaponPose(backAim)).toEqual({
      rotation: expect.any(Number),
      offsetX: 4,
      offsetY: -30,
      barrelScaleY: 0.72,
      depthOffset: PLAYER_WEAPON_BACK_DEPTH_OFFSET,
    });
    expect(getStoryPlayerWeaponPose(backAim).rotation).toBeGreaterThan(backAim);

    expect(getStoryPlayerWeaponPose(frontAim)).toEqual({
      rotation: expect.any(Number),
      offsetX: 3,
      offsetY: -14,
      barrelScaleY: 0.76,
      depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
    });
    expect(getStoryPlayerWeaponPose(frontAim).rotation).toBeGreaterThan(frontAim);

    expect(getStoryPlayerWeaponPose(sideAim)).toEqual({
      rotation: 0,
      offsetX: 2,
      offsetY: -18,
      barrelScaleY: 0.9,
      depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
    });
  });
});
