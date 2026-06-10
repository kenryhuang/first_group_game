import { describe, expect, it } from "vitest";
import {
  BOSS_RUSH_SCENARIOS,
  BOSS_RUSH_SINGLE_DUELS,
  getBossRushPlayerLevel,
  getBossRushScenario,
} from "./bossRush";

describe("boss rush scenarios", () => {
  it("defines the ten single boss duels first", () => {
    expect(BOSS_RUSH_SINGLE_DUELS.map((scenario) => scenario.name)).toEqual([
      "单挑：变异厨师",
      "单挑：变异小丑",
      "单挑：变异快递员",
      "单挑：白骨骑士",
      "单挑：驯兽师",
      "单挑：毒雾医师",
      "单挑：磁暴工程师",
      "单挑：魔术师",
      "单挑：军火车队",
      "单挑：失控战争核心",
    ]);
    expect(BOSS_RUSH_SCENARIOS.slice(0, 10).map((scenario) => scenario.id)).toEqual(
      BOSS_RUSH_SINGLE_DUELS.map((scenario) => scenario.id),
    );
  });

  it("keeps every single boss duel to one main boss entry", () => {
    for (const scenario of BOSS_RUSH_SINGLE_DUELS) {
      expect(scenario.entries).toHaveLength(1);
      expect(scenario.entries[0].count).toBe(1);
      expect(scenario.description).toContain("单挑");
    }
  });

  it("scales player level by single boss strength", () => {
    expect(BOSS_RUSH_SINGLE_DUELS.map((scenario) => getBossRushPlayerLevel(scenario.id))).toEqual([
      5,
      10,
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50,
    ]);
    expect(getBossRushPlayerLevel("final-war")).toBe(50);
  });

  it("defines the five requested boss rush dungeons", () => {
    expect(BOSS_RUSH_SCENARIOS.slice(10).map((scenario) => scenario.name)).toEqual([
      "终焉之战",
      "厨房混战",
      "远程狙击",
      "圣光审判",
      "杂技表演",
    ]);
  });

  it("keeps scenario combat rosters aligned with the design", () => {
    expect(getBossRushScenario("final-war").entries).toHaveLength(5);
    expect(getBossRushScenario("kitchen-brawl").entries[0]).toMatchObject({ bossId: "chef", count: 6 });
    expect(getBossRushScenario("sniper-crossfire").entries).toEqual([
      { kind: "roamingBoss", bossId: "courier", count: 1, health: 50000 },
      { kind: "finalBoss", count: 4, health: 3000, phase: 1 },
    ]);
    expect(getBossRushScenario("holy-judgment").entries).toEqual([
      { kind: "hospitalKnight", count: 3, health: 4000, phase: 2 },
      { kind: "eliteBone", count: 60 },
    ]);
    expect(getBossRushScenario("circus-show").entries[0]).toMatchObject({ bossId: "clown", count: 20, health: 100 });
  });
});
