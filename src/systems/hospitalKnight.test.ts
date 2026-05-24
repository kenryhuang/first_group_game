import { describe, expect, it } from "vitest";
import {
  HOSPITAL_KNIGHT_AGGRO_RADIUS,
  HOSPITAL_KNIGHT_DEFINITION,
  HOSPITAL_KNIGHT_GUARD_RADIUS,
  HOSPITAL_KNIGHT_SPAWN,
  getHospitalKnightGuardRoamTarget,
  getHospitalKnightPhase,
  getInitialBoneHordeCount,
  isHospitalKnightAtRuinedHospital,
  isHospitalKnightDamageable,
  shouldConvertZombieToBoneSoldier,
  shouldHospitalKnightAggro,
} from "./hospitalKnight";

describe("hospital knight boss", () => {
  it("spawns at the ruined hospital with a large bone horde", () => {
    expect(HOSPITAL_KNIGHT_SPAWN.x).toBeLessThan(1400);
    expect(HOSPITAL_KNIGHT_SPAWN.y).toBeGreaterThan(3000);
    expect(isHospitalKnightAtRuinedHospital(HOSPITAL_KNIGHT_SPAWN)).toBe(true);
    expect(HOSPITAL_KNIGHT_DEFINITION.maxHealth).toBe(2000);
    expect(getInitialBoneHordeCount()).toBe(20);
  });

  it("guards the hospital until the player provokes it", () => {
    expect(shouldHospitalKnightAggro(HOSPITAL_KNIGHT_AGGRO_RADIUS + 1, false)).toBe(false);
    expect(shouldHospitalKnightAggro(HOSPITAL_KNIGHT_AGGRO_RADIUS, false)).toBe(true);
    expect(shouldHospitalKnightAggro(9999, true)).toBe(true);
  });

  it("keeps its dormant patrol inside the hospital grounds", () => {
    const target = getHospitalKnightGuardRoamTarget(5);
    const distanceFromHospital = Math.hypot(target.x - HOSPITAL_KNIGHT_SPAWN.x, target.y - HOSPITAL_KNIGHT_SPAWN.y);
    expect(distanceFromHospital).toBeLessThanOrEqual(HOSPITAL_KNIGHT_GUARD_RADIUS);
    expect(isHospitalKnightAtRuinedHospital(target)).toBe(true);
  });

  it("enters phase two at half health and revives bones into soldiers", () => {
    expect(getHospitalKnightPhase(2000)).toBe(1);
    expect(getHospitalKnightPhase(1000)).toBe(2);
    expect(isHospitalKnightDamageable(2, 4)).toBe(false);
    expect(isHospitalKnightDamageable(2, 0)).toBe(true);
  });

  it("limits holy shroud conversions to three casts", () => {
    expect(shouldConvertZombieToBoneSoldier(0)).toBe(true);
    expect(shouldConvertZombieToBoneSoldier(2)).toBe(true);
    expect(shouldConvertZombieToBoneSoldier(3)).toBe(false);
  });
});
