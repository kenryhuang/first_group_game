import { describe, expect, it } from "vitest";
import {
  PLAYER_WEAPON_BACK_DEPTH_OFFSET,
  PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
  PLAYER_WEAPON_MUZZLE_DISTANCE,
  PLAYER_WEAPON_VISUAL_GEOMETRY,
  getPlayerWeaponDepthOffset,
  getPlayerWeaponVisualAimAngle,
  getStoryPlayerWeaponHoldPose,
  getStoryPlayerWeaponPose,
} from "./playerWeaponVisuals";

describe("player weapon visuals", () => {
  it("keeps the weapon compact enough to reveal the redrawn story character", () => {
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.x).toBeLessThanOrEqual(2);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.width).toBeLessThanOrEqual(30);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.barrel.height).toBeLessThanOrEqual(9);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.tipX).toBeLessThanOrEqual(50);
    expect(PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.circleRadius).toBeLessThanOrEqual(4.4);
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

  it("uses 2.5d hand anchors while preserving the firing line angle", () => {
    const backAim = Math.atan2(-64, 128);
    const frontAim = Math.atan2(64, -128);
    const sideAim = 0;

    expect(getStoryPlayerWeaponPose(backAim)).toEqual({
      rotation: expect.any(Number),
      offsetX: 4,
      offsetY: -28,
      barrelScaleY: 0.62,
      depthOffset: PLAYER_WEAPON_BACK_DEPTH_OFFSET,
    });
    expect(getStoryPlayerWeaponPose(backAim).rotation).toBeCloseTo(backAim);

    expect(getStoryPlayerWeaponPose(frontAim)).toEqual({
      rotation: expect.any(Number),
      offsetX: 3,
      offsetY: -13,
      barrelScaleY: 0.66,
      depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
    });
    expect(getStoryPlayerWeaponPose(frontAim).rotation).toBeCloseTo(frontAim);

    expect(getStoryPlayerWeaponPose(sideAim)).toEqual({
      rotation: 0,
      offsetX: 2,
      offsetY: -18,
      barrelScaleY: 0.9,
      depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
    });
  });

  it("keeps the idle story weapon held horizontally in front of both hands", () => {
    expect(getStoryPlayerWeaponHoldPose({ x: 0, y: 1 })).toEqual({
      rotation: 0,
      offsetX: -14,
      offsetY: -17,
      barrelScaleY: 0.72,
      depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
    });

    expect(getStoryPlayerWeaponHoldPose({ x: -1, y: 0 })).toEqual({
      rotation: Math.PI,
      offsetX: 14,
      offsetY: -17,
      barrelScaleY: 0.72,
      depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
    });
  });

  it("aims the weapon visual from the held rear anchor toward the bullet target plane", () => {
    expect(
      getPlayerWeaponVisualAimAngle({ x: 10, y: 20 }, { x: 110, y: 70 }),
    ).toBeCloseTo(Math.atan2(50, 100));
  });
});
