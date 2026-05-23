import { describe, expect, it } from "vitest";
import { ADVANCED_BOSS_SKILLS, getAdvancedBossSkills, getNextAdvancedBossSkill } from "./bossSkills";

describe("advanced boss skills", () => {
  it("adds exactly two advanced skills to each roaming Boss", () => {
    expect(getAdvancedBossSkills("chef").map((skill) => skill.id)).toEqual([
      "pressure-cooker-bomb",
      "chopping-board-charge",
    ]);
    expect(getAdvancedBossSkills("clown").map((skill) => skill.id)).toEqual([
      "jack-in-the-box",
      "clone-trick",
    ]);
    expect(getAdvancedBossSkills("courier").map((skill) => skill.id)).toEqual([
      "drone-airdrop",
      "delivery-lock",
    ]);
  });

  it("describes warning windows, damage, and combat roles", () => {
    for (const skill of ADVANCED_BOSS_SKILLS) {
      expect(skill.warningMs).toBeGreaterThanOrEqual(450);
      expect(skill.damage).toBeGreaterThan(0);
      expect(["area", "summon", "charge", "lock"]).toContain(skill.role);
    }
  });

  it("cycles through each Boss skill pair deterministically", () => {
    expect(getNextAdvancedBossSkill("chef", 0).id).toBe("pressure-cooker-bomb");
    expect(getNextAdvancedBossSkill("chef", 1).id).toBe("chopping-board-charge");
    expect(getNextAdvancedBossSkill("chef", 2).id).toBe("pressure-cooker-bomb");
  });
});
