import { describe, expect, it } from "vitest";
import {
  CHEF_CHILI_OIL_BOTTLE_FLIGHT_MS,
  CHEF_CHILI_OIL_BOTTLE_COUNT,
  CHEF_CRASH_AIRBORNE_OFFSET_Y,
  CHEF_MEAT_GRINDER_ARM_COUNT,
  CHEF_MEAT_GRINDER_HEALTH_RATIO,
  CHEF_WOK_MODEL_RADIUS,
  CHEF_WOK_BLOCK_HALF_ANGLE,
  shouldChefBlockBasicAttack,
  shouldTriggerChefMeatGrinder,
} from "./chef";

describe("chef boss rules", () => {
  it("defines the requested chef skill values", () => {
    expect(CHEF_CHILI_OIL_BOTTLE_COUNT).toBe(6);
    expect(CHEF_CHILI_OIL_BOTTLE_FLIGHT_MS).toBeGreaterThanOrEqual(420);
    expect(CHEF_WOK_MODEL_RADIUS).toBeGreaterThanOrEqual(24);
    expect(CHEF_CRASH_AIRBORNE_OFFSET_Y).toBeLessThan(0);
    expect(CHEF_MEAT_GRINDER_ARM_COUNT).toBe(3);
    expect(CHEF_MEAT_GRINDER_HEALTH_RATIO).toBe(0.35);
    expect(CHEF_WOK_BLOCK_HALF_ANGLE).toBeGreaterThan(0);
  });

  it("blocks only front-facing basic attacks while idle", () => {
    expect(
      shouldChefBlockBasicAttack({
        chefRotation: 0,
        incomingAngle: 0.1,
        isBasicAttack: true,
        isBusy: false,
      }),
    ).toBe(true);
    expect(
      shouldChefBlockBasicAttack({
        chefRotation: 0,
        incomingAngle: Math.PI,
        isBasicAttack: true,
        isBusy: false,
      }),
    ).toBe(false);
    expect(
      shouldChefBlockBasicAttack({
        chefRotation: 0,
        incomingAngle: 0,
        isBasicAttack: false,
        isBusy: false,
      }),
    ).toBe(false);
    expect(
      shouldChefBlockBasicAttack({
        chefRotation: 0,
        incomingAngle: 0,
        isBasicAttack: true,
        isBusy: true,
      }),
    ).toBe(false);
  });

  it("triggers meat grinder only once below the health threshold", () => {
    expect(shouldTriggerChefMeatGrinder({ health: 1500, maxHealth: 4000, used: false })).toBe(false);
    expect(shouldTriggerChefMeatGrinder({ health: 1400, maxHealth: 4000, used: false })).toBe(true);
    expect(shouldTriggerChefMeatGrinder({ health: 900, maxHealth: 4000, used: true })).toBe(false);
  });
});
