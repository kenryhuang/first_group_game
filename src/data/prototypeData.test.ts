import { describe, expect, it } from "vitest";
import {
  BOSS_ORDER,
  PLAYER_BASELINE,
  PROTOTYPE_LIMITS,
  SKILLS,
} from "./prototypeData";

describe("prototype data", () => {
  it("defines the 30-level prototype Boss order from the spec", () => {
    expect(BOSS_ORDER.map((boss) => boss.id)).toEqual([
      "chef",
      "clown",
      "courier",
    ]);
    expect(BOSS_ORDER.map((boss) => boss.descentLevel)).toEqual([10, 20, 30]);
    expect(BOSS_ORDER.map((boss) => boss.specialItem.name)).toEqual([
      "血肉菜谱",
      "裂笑面具",
      "染血运单",
    ]);
  });

  it("keeps player baseline and active slot limits aligned with the spec", () => {
    expect(PLAYER_BASELINE).toMatchObject({
      maxHealth: 100,
      moveSpeed: 5,
      basicDamage: 10,
      basicAttackIntervalMs: 600,
      pickupRadius: 2.5,
      safePollutionLoad: 100,
    });
    expect(PROTOTYPE_LIMITS.activeSkillSlots).toBe(4);
    expect(PROTOTYPE_LIMITS.levelCap).toBe(30);
  });

  it("includes at least one explosive skill for the courier chain", () => {
    expect(SKILLS.some((skill) => skill.tags.includes("explosive"))).toBe(true);
  });
});
