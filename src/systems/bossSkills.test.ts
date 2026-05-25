import { describe, expect, it } from "vitest";
import {
  ADVANCED_BOSS_SKILLS,
  BIG_FIRE_PIT,
  COURIER_LOCKED_CHARGE_SPEED,
  JESTER_BOX_EFFECTS,
  ROAMING_BOSS_RUNTIME_STATS,
  getAdvancedBossSkills,
  getNextAdvancedBossSkill,
} from "./bossSkills";

describe("advanced boss skills", () => {
  it("defines runtime health and cooldown for each roaming Boss", () => {
    expect(ROAMING_BOSS_RUNTIME_STATS.chef.maxHealth).toBe(4000);
    expect(ROAMING_BOSS_RUNTIME_STATS.chef.skillCooldownMs).toBe(3200);
    expect(ROAMING_BOSS_RUNTIME_STATS.clown.maxHealth).toBe(1000);
    expect(ROAMING_BOSS_RUNTIME_STATS.clown.skillCooldownMs).toBe(4200);
    expect(ROAMING_BOSS_RUNTIME_STATS.courier.maxHealth).toBe(1550);
    expect(ROAMING_BOSS_RUNTIME_STATS.courier.skillCooldownMs).toBe(3600);
  });

  it("adds the requested advanced skills to each roaming Boss", () => {
    expect(getAdvancedBossSkills("chef").map((skill) => skill.id)).toEqual([
      "pressure-cooker-bomb",
      "chopping-board-charge",
      "cauldron-descend",
    ]);
    expect(getAdvancedBossSkills("clown").map((skill) => skill.id)).toEqual([
      "jack-in-the-box",
      "clone-trick",
      "knife-gala",
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
      expect(["area", "summon", "charge", "lock", "projectile"]).toContain(skill.role);
    }
  });

  it("defines the new low-health and control effects", () => {
    const chefBomb = getNextAdvancedBossSkill("chef", 0);
    const cauldron = getAdvancedBossSkills("chef").find((skill) => skill.id === "cauldron-descend");
    const knifeGala = getAdvancedBossSkills("clown").find((skill) => skill.id === "knife-gala");

    expect(chefBomb.lowHealthDamage).toBe(10);
    expect(chefBomb.lowHealthThreshold).toBe(1000);
    expect(BIG_FIRE_PIT.radius).toBe(300);
    expect(BIG_FIRE_PIT.lifeMs).toBe(10000);
    expect(BIG_FIRE_PIT.tickMs).toBe(1000);
    expect(BIG_FIRE_PIT.damage).toBe(8);
    expect(cauldron).toMatchObject({ warningMs: 1000, damage: 30, radius: 200 });
    expect(knifeGala).toMatchObject({ warningMs: 500, damage: 32 });
    expect(JESTER_BOX_EFFECTS).toEqual(["blast", "freeze", "vision"]);
    expect(COURIER_LOCKED_CHARGE_SPEED).toBe(3000);
  });

  it("cycles through each Boss skill set deterministically", () => {
    expect(getNextAdvancedBossSkill("chef", 0).id).toBe("pressure-cooker-bomb");
    expect(getNextAdvancedBossSkill("chef", 1).id).toBe("chopping-board-charge");
    expect(getNextAdvancedBossSkill("chef", 2).id).toBe("cauldron-descend");
    expect(getNextAdvancedBossSkill("chef", 3).id).toBe("pressure-cooker-bomb");
  });
});
