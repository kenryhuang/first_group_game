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
    expect(Object.keys(ROAMING_BOSS_RUNTIME_STATS)).toEqual([
      "chef",
      "clown",
      "courier",
      "beastmaster",
      "plague-doctor",
      "tesla-engineer",
      "magician",
      "war-convoy",
    ]);
    for (const stats of Object.values(ROAMING_BOSS_RUNTIME_STATS)) {
      expect(stats.maxHealth).toBeGreaterThan(0);
      expect(stats.skillCooldownMs).toBeGreaterThan(0);
    }
    expect(ROAMING_BOSS_RUNTIME_STATS.magician.maxHealth).toBe(6500);
  });

  it("adds the requested advanced skills to each roaming Boss", () => {
    expect(getAdvancedBossSkills("chef").map((skill) => skill.id)).toEqual([
      "chili-oil-cover",
      "crash-landing",
      "meat-grinder",
    ]);
    expect(getAdvancedBossSkills("clown").map((skill) => skill.id)).toEqual([
      "hidden-magic-box",
      "knife-burst",
      "surprise-drop",
      "spiral-knife-ultimate",
    ]);
    expect(getAdvancedBossSkills("courier").map((skill) => skill.id)).toEqual([
      "delivery-route",
      "explosive-parcel",
      "locker-teleport",
      "signature-lock",
      "citywide-delivery",
    ]);
    expect(getAdvancedBossSkills("beastmaster").map((skill) => skill.id)).toEqual([
      "zombie-siege",
      "hound-rush",
      "beast-unstoppable",
      "stampede-command",
      "total-frenzy",
    ]);
    expect(getAdvancedBossSkills("plague-doctor").map((skill) => skill.id)).toEqual([
      "toxic-cloud",
      "infected-patients",
      "sedative-dart",
      "infusion-stand",
      "quarantine-ward",
    ]);
    expect(getAdvancedBossSkills("tesla-engineer").map((skill) => skill.id)).toEqual([
      "tesla-turret",
      "magnetic-mine",
      "electric-grid",
      "overload-repair",
      "blackout-field",
    ]);
    expect(getAdvancedBossSkills("magician").map((skill) => skill.id)).toEqual([
      "curtain-shift",
      "spotlight-judgement",
      "hat-maze",
      "mirror-hall",
      "finale-theater",
    ]);
    expect(getAdvancedBossSkills("war-convoy").map((skill) => skill.id)).toEqual([
      "commander-deploy",
      "armored-corridor",
      "escort-crossfire",
      "ammo-truck-sacrifice",
      "iron-encirclement",
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
    const chiliOil = getNextAdvancedBossSkill("chef", 0);
    const crashLanding = getAdvancedBossSkills("chef").find((skill) => skill.id === "crash-landing");
    const spiralKnife = getAdvancedBossSkills("clown").find((skill) => skill.id === "spiral-knife-ultimate");
    const citywideDelivery = getAdvancedBossSkills("courier").find((skill) => skill.id === "citywide-delivery");
    const quarantineWard = getAdvancedBossSkills("plague-doctor").find((skill) => skill.id === "quarantine-ward");
    const blackoutField = getAdvancedBossSkills("tesla-engineer").find((skill) => skill.id === "blackout-field");
    const ironEncirclement = getAdvancedBossSkills("war-convoy").find((skill) => skill.id === "iron-encirclement");
    const finaleTheater = getAdvancedBossSkills("magician").find((skill) => skill.id === "finale-theater");

    expect(chiliOil).toMatchObject({ warningMs: 650, damage: 8, radius: 92 });
    expect(BIG_FIRE_PIT.radius).toBe(300);
    expect(BIG_FIRE_PIT.lifeMs).toBe(10000);
    expect(BIG_FIRE_PIT.tickMs).toBe(1000);
    expect(BIG_FIRE_PIT.damage).toBe(8);
    expect(crashLanding).toMatchObject({ warningMs: 950, damage: 34, radius: 220 });
    expect(spiralKnife).toMatchObject({ warningMs: 700, damage: 8, radius: 9999 });
    expect(citywideDelivery).toMatchObject({ warningMs: 850, damage: 10, radius: 9999 });
    expect(quarantineWard).toMatchObject({ warningMs: 900, damage: 20, radius: 9999 });
    expect(blackoutField).toMatchObject({ warningMs: 900, damage: 28, radius: 9999 });
    expect(ironEncirclement).toMatchObject({ warningMs: 1000, damage: 36, radius: 9999 });
    expect(finaleTheater).toMatchObject({ warningMs: 900, damage: 18, radius: 9999 });
    expect(JESTER_BOX_EFFECTS).toEqual(["blast", "freeze", "vision"]);
    expect(COURIER_LOCKED_CHARGE_SPEED).toBe(3000);
  });

  it("cycles through each Boss skill set deterministically", () => {
    expect(getNextAdvancedBossSkill("chef", 0).id).toBe("chili-oil-cover");
    expect(getNextAdvancedBossSkill("chef", 1).id).toBe("crash-landing");
    expect(getNextAdvancedBossSkill("chef", 2).id).toBe("meat-grinder");
    expect(getNextAdvancedBossSkill("chef", 3).id).toBe("chili-oil-cover");
    expect(getNextAdvancedBossSkill("clown", 0).id).toBe("hidden-magic-box");
    expect(getNextAdvancedBossSkill("clown", 1).id).toBe("knife-burst");
    expect(getNextAdvancedBossSkill("clown", 2).id).toBe("surprise-drop");
    expect(getNextAdvancedBossSkill("clown", 3).id).toBe("spiral-knife-ultimate");
    expect(getNextAdvancedBossSkill("clown", 4).id).toBe("hidden-magic-box");
    expect(getNextAdvancedBossSkill("courier", 0).id).toBe("delivery-route");
    expect(getNextAdvancedBossSkill("courier", 1).id).toBe("explosive-parcel");
    expect(getNextAdvancedBossSkill("courier", 2).id).toBe("locker-teleport");
    expect(getNextAdvancedBossSkill("courier", 3).id).toBe("signature-lock");
    expect(getNextAdvancedBossSkill("courier", 4).id).toBe("citywide-delivery");
    expect(getNextAdvancedBossSkill("courier", 5).id).toBe("delivery-route");
    expect(getNextAdvancedBossSkill("plague-doctor", 0).id).toBe("toxic-cloud");
    expect(getNextAdvancedBossSkill("plague-doctor", 1).id).toBe("infected-patients");
    expect(getNextAdvancedBossSkill("plague-doctor", 2).id).toBe("sedative-dart");
    expect(getNextAdvancedBossSkill("plague-doctor", 3).id).toBe("infusion-stand");
    expect(getNextAdvancedBossSkill("plague-doctor", 4).id).toBe("quarantine-ward");
    expect(getNextAdvancedBossSkill("plague-doctor", 5).id).toBe("toxic-cloud");
    expect(getNextAdvancedBossSkill("tesla-engineer", 0).id).toBe("tesla-turret");
    expect(getNextAdvancedBossSkill("tesla-engineer", 1).id).toBe("magnetic-mine");
    expect(getNextAdvancedBossSkill("tesla-engineer", 2).id).toBe("electric-grid");
    expect(getNextAdvancedBossSkill("tesla-engineer", 3).id).toBe("overload-repair");
    expect(getNextAdvancedBossSkill("tesla-engineer", 4).id).toBe("blackout-field");
    expect(getNextAdvancedBossSkill("tesla-engineer", 5).id).toBe("tesla-turret");
    expect(getNextAdvancedBossSkill("war-convoy", 0).id).toBe("commander-deploy");
    expect(getNextAdvancedBossSkill("war-convoy", 1).id).toBe("armored-corridor");
    expect(getNextAdvancedBossSkill("war-convoy", 2).id).toBe("escort-crossfire");
    expect(getNextAdvancedBossSkill("war-convoy", 3).id).toBe("ammo-truck-sacrifice");
    expect(getNextAdvancedBossSkill("war-convoy", 4).id).toBe("iron-encirclement");
    expect(getNextAdvancedBossSkill("war-convoy", 5).id).toBe("commander-deploy");
    expect(getNextAdvancedBossSkill("magician", 0).id).toBe("curtain-shift");
    expect(getNextAdvancedBossSkill("magician", 1).id).toBe("spotlight-judgement");
    expect(getNextAdvancedBossSkill("magician", 2).id).toBe("hat-maze");
    expect(getNextAdvancedBossSkill("magician", 3).id).toBe("mirror-hall");
    expect(getNextAdvancedBossSkill("magician", 4).id).toBe("finale-theater");
    expect(getNextAdvancedBossSkill("magician", 5).id).toBe("curtain-shift");
  });
});
