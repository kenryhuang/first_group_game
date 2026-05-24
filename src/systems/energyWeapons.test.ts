import { describe, expect, it } from "vitest";
import {
  ENERGY_SKILL_DEFINITIONS,
  advanceEnergySkillCooldowns,
  getActiveEnergySkills,
  getAutoEnergySkills,
  getManualEnergySkills,
  getEnergySkillPower,
  getMechEvolutionStage,
  isEnergySkillReady,
} from "./energyWeapons";

describe("energy and mobility skills", () => {
  it("unlocks laser, teleport, rewind, mines, and prism skills from upgrade ranks", () => {
    const active = getActiveEnergySkills({
      "focus-laser": 1,
      "phase-blink": 1,
      "temporal-rewind": 1,
      "warp-mines": 0,
    });

    expect(active.map((skill) => skill.id)).toEqual(["focus-laser", "phase-blink", "temporal-rewind"]);
  });

  it("defines laser, rain, blink, rewind, mine, and passive prism profiles", () => {
    expect(ENERGY_SKILL_DEFINITIONS.map((skill) => skill.id)).toEqual([
      "focus-laser",
      "orbital-laser-rain",
      "phase-blink",
      "temporal-rewind",
      "warp-mines",
      "prism-amplifier",
    ]);
    expect(ENERGY_SKILL_DEFINITIONS.find((skill) => skill.id === "focus-laser")?.mode).toBe("beam");
    expect(ENERGY_SKILL_DEFINITIONS.find((skill) => skill.id === "phase-blink")?.mode).toBe("blink");
    expect(ENERGY_SKILL_DEFINITIONS.find((skill) => skill.id === "temporal-rewind")?.mode).toBe("rewind");
    expect(ENERGY_SKILL_DEFINITIONS.find((skill) => skill.id === "phase-blink")?.trigger).toBe("manual");
  });

  it("keeps manual phase blink out of automatic energy skill casts", () => {
    const automatic = getAutoEnergySkills({
      "focus-laser": 1,
      "phase-blink": 1,
      "warp-mines": 1,
    });

    expect(automatic.map((skill) => skill.id)).toEqual(["focus-laser", "warp-mines"]);
  });

  it("advances manual skill cooldowns after they are used", () => {
    const phaseBlink = ENERGY_SKILL_DEFINITIONS.find((skill) => skill.id === "phase-blink")!;
    const manual = getManualEnergySkills({ "phase-blink": 1 });
    const cooldowns = advanceEnergySkillCooldowns({ "phase-blink": 0 }, manual, phaseBlink.cooldownMs);

    expect(isEnergySkillReady(phaseBlink, cooldowns["phase-blink"] ?? 0)).toBe(true);
  });

  it("scales power by rank and gates cooldown readiness", () => {
    const laser = ENERGY_SKILL_DEFINITIONS.find((skill) => skill.id === "focus-laser")!;

    expect(isEnergySkillReady(laser, laser.cooldownMs - 1)).toBe(false);
    expect(isEnergySkillReady(laser, laser.cooldownMs)).toBe(true);
    expect(getEnergySkillPower(laser, 3)).toBeGreaterThan(getEnergySkillPower(laser, 1));
  });

  it("moves mech appearance through heavy, laser, and temporal stages", () => {
    expect(getMechEvolutionStage({})).toBe("base");
    expect(getMechEvolutionStage({ "missile-pod": 1 })).toBe("heavy");
    expect(getMechEvolutionStage({ "missile-pod": 1, "focus-laser": 1 })).toBe("laser");
    expect(getMechEvolutionStage({ "focus-laser": 1, "phase-blink": 1 })).toBe("temporal");
  });
});
