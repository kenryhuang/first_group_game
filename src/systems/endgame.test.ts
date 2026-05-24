import { describe, expect, it } from "vitest";
import type { RunState } from "../domain/types";
import { createRunState } from "./runState";
import {
  FINAL_BOSS_DEFINITION,
  FINAL_BOSS_PHASE_ONE_SKILL,
  FINAL_BOSS_PHASE_THREE_SKILL,
  FINAL_BOSS_PHASE_TWO_SKILL,
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

  it("tracks the city core final boss phases by absolute health", () => {
    expect(FINAL_BOSS_DEFINITION.maxHealth).toBe(10000);
    expect(getFinalBossPhase(9000)).toBe(1);
    expect(getFinalBossPhase(7000)).toBe(2);
    expect(getFinalBossPhase(5000)).toBe(3);
  });

  it("defines phase one as a city core turret with full-map interference and beam", () => {
    expect(FINAL_BOSS_PHASE_ONE_SKILL.interferenceRadius).toBeGreaterThanOrEqual(10000);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.slowMultiplier).toBe(0.5);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.beamDelayMs).toBe(1000);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.beamDamage).toBe(18);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.coreSpeed).toBe(0);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.buildingCollisionDamage).toBe(10);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.buildingCollisionIntervalMs).toBe(1000);
    expect(FINAL_BOSS_PHASE_ONE_SKILL.buildingChargeCooldownMs).toBe(5000);
  });

  it("defines phase two shield, bombing, and city wanted mechanics", () => {
    expect(FINAL_BOSS_PHASE_TWO_SKILL.coreSpeed).toBe(0);
    expect(FINAL_BOSS_PHASE_TWO_SKILL.onlyExplosiveDamage).toBe(true);
    expect(FINAL_BOSS_PHASE_TWO_SKILL.bombWarningMs).toBe(2000);
    expect(FINAL_BOSS_PHASE_TWO_SKILL.bombDamage).toBe(42);
    expect(FINAL_BOSS_PHASE_TWO_SKILL.sniperBuildingCount).toBe(2);
    expect(FINAL_BOSS_PHASE_TWO_SKILL.sniperDamage).toBe(32);
  });

  it("defines phase three mech skills and instant-fail final beam", () => {
    expect(FINAL_BOSS_PHASE_THREE_SKILL.mechSpeed).toBe(92);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.buildingWeaponDamage).toBe(20);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.orangeBeamDamage).toBe(80);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.missileCount).toBe(6);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.missileLockMs).toBe(1500);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.crawlerCount).toBe(5);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.crawlerArmMs).toBe(1000);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.crawlerExplosionRadius).toBe(56);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.suppressMs).toBe(5000);
    expect(FINAL_BOSS_PHASE_THREE_SKILL.finalBeamHealthThreshold).toBe(1000);
  });
});
