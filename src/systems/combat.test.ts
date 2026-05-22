import { describe, expect, it } from "vitest";
import { BOSS_ORDER } from "../data/prototypeData";
import { applyDamage, createEnemy, defeatBoss, useSkill } from "./combat";

describe("combat", () => {
  it("applies basic and skill damage to enemies", () => {
    const enemy = createEnemy("common-zombie", "普通丧尸", 40, 5);
    expect(applyDamage(enemy, 10).health).toBe(30);
    expect(applyDamage(enemy, 99).defeated).toBe(true);
  });

  it("skill use returns damage and temporary pollution", () => {
    const result = useSkill("explosive-parcel", 1.2);
    expect(result.damage).toBe(77);
    expect(result.temporaryPollution).toBe(7);
    expect(result.tags).toContain("explosive");
  });

  it("Boss defeat awards special item and stage pollution", () => {
    const result = defeatBoss(BOSS_ORDER[0]);
    expect(result.specialItemId).toBe("flesh-recipe");
    expect(result.stagePollution).toBe(15);
    expect(result.experience).toBeGreaterThan(0);
  });
});
