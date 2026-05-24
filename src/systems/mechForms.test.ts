import { describe, expect, it } from "vitest";
import {
  MECH_FORM_UNLOCK_LEVEL,
  getAvailableMechForms,
  getDominantMechForm,
  getMechFormScores,
  getUltimateDefinition,
} from "./mechForms";

describe("mech forms", () => {
  it("scores laser, missile, and blade affinities from upgrade ranks", () => {
    const scores = getMechFormScores({
      "focus-laser": 2,
      "missile-pod": 1,
      "armor-plating": 3,
    });

    expect(scores.laser).toBe(2);
    expect(scores.missile).toBe(1);
    expect(scores.blade).toBe(3);
    expect(getDominantMechForm(scores)).toBe("blade");
  });

  it("unlocks final form choices around level 50 from invested affinities", () => {
    expect(MECH_FORM_UNLOCK_LEVEL).toBe(50);
    expect(getAvailableMechForms(49, { "focus-laser": 5 })).toEqual([]);
    expect(getAvailableMechForms(50, { "focus-laser": 3, "missile-pod": 3 })).toEqual([
      "laser",
      "missile",
    ]);
  });

  it("defines a distinct ultimate for every final form", () => {
    expect(getUltimateDefinition("laser").name).toBe("天基裁决光束");
    expect(getUltimateDefinition("missile").name).toBe("末日饱和轰炸");
    expect(getUltimateDefinition("blade").name).toBe("热熔斩舰刀");
  });
});
