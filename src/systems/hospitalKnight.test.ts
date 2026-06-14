import { describe, expect, it } from "vitest";
import {
  HOSPITAL_KNIGHT_AGGRO_RADIUS,
  HOSPITAL_KNIGHT_BONE_COMMAND_COUNT,
  HOSPITAL_KNIGHT_DEAD_FORMATION_LANES,
  HOSPITAL_KNIGHT_DEFINITION,
  HOSPITAL_KNIGHT_GUARD_RADIUS,
  HOSPITAL_KNIGHT_HOLY_LANCE_SPIKES,
  HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT,
  HOSPITAL_KNIGHT_SPAWN,
  BONE_CONTACT_DAMAGE,
  BONE_SOLDIER_CONTACT_DAMAGE,
  GIANT_SWORD_TRAP_MS,
  getHospitalKnightGuardRoamTarget,
  getHospitalKnightPhase,
  getInitialBoneHordeCount,
  getNextHospitalKnightSkill,
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

  it("uses the tuned shackle duration and bone contact damage", () => {
    expect(GIANT_SWORD_TRAP_MS).toBe(3000);
    expect(BONE_CONTACT_DAMAGE).toBe(10);
    expect(BONE_SOLDIER_CONTACT_DAMAGE).toBe(19);
  });

  it("rotates through the full legion kit with stronger phase two options", () => {
    expect(getNextHospitalKnightSkill(1, 0)).toBe("bone-command");
    expect(getNextHospitalKnightSkill(1, 1)).toBe("giant-sword-judgment");
    expect(getNextHospitalKnightSkill(1, 2)).toBe("holy-lance-charge");
    expect(getNextHospitalKnightSkill(1, 3)).toBe("bone-command");

    expect(getNextHospitalKnightSkill(2, 0)).toBe("royal-guard");
    expect(getNextHospitalKnightSkill(2, 1)).toBe("giant-sword-judgment");
    expect(getNextHospitalKnightSkill(2, 2)).toBe("holy-lance-charge");
    expect(getNextHospitalKnightSkill(2, 3)).toBe("dead-formation");

    expect(HOSPITAL_KNIGHT_BONE_COMMAND_COUNT).toBe(12);
    expect(HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT).toBe(8);
    expect(HOSPITAL_KNIGHT_DEAD_FORMATION_LANES).toBe(4);
    expect(HOSPITAL_KNIGHT_HOLY_LANCE_SPIKES).toBe(6);
  });
});
