import { describe, expect, it } from "vitest";
import type { RunState } from "../domain/types";
import { createRunState } from "./runState";
import {
  FINAL_BOSS_DEFINITION,
  getEndgameUltimateDefinition,
  getFinalBossPhase,
  isEndgameReady,
} from "./endgame";

function createEndgameState(overrides: Partial<RunState> = {}): RunState {
  return {
    ...createRunState(),
    level: 60,
    selectedMechFormId: "laser",
    killedBossIds: ["chef", "clown", "courier"],
    ...overrides,
  };
}

describe("endgame", () => {
  it("starts after the player has a final mech form and reaches the endgame threshold", () => {
    expect(isEndgameReady(createEndgameState())).toBe(true);
    expect(isEndgameReady(createEndgameState({ level: 50, killedBossIds: [] }))).toBe(true);
    expect(isEndgameReady(createEndgameState({ level: 49, killedBossIds: [] }))).toBe(false);
    expect(isEndgameReady(createEndgameState({ selectedMechFormId: null }))).toBe(false);
    expect(isEndgameReady(createEndgameState({ level: 40, killedBossIds: ["chef", "clown", "courier"] }))).toBe(true);
  });

  it("defines super ultimates for every final mech form", () => {
    expect(getEndgameUltimateDefinition("laser").name).toBe("集天光柱");
    expect(getEndgameUltimateDefinition("missile").name).toBe("战术核弹");
    expect(getEndgameUltimateDefinition("blade").name).toBe("机甲变形");
  });

  it("makes endgame ultimates visually large", () => {
    expect(getEndgameUltimateDefinition("laser").radius).toBeGreaterThanOrEqual(360);
    expect(getEndgameUltimateDefinition("missile").radius).toBeGreaterThanOrEqual(900);
    expect(getEndgameUltimateDefinition("blade").radius).toBeGreaterThanOrEqual(380);
  });

  it("tracks the mutated mech final boss phases by health ratio", () => {
    expect(FINAL_BOSS_DEFINITION.name).toBe("失控战争核心");
    expect(getFinalBossPhase(5000, 5000)).toBe(1);
    expect(getFinalBossPhase(3000, 5000)).toBe(2);
    expect(getFinalBossPhase(1200, 5000)).toBe(3);
  });
});
