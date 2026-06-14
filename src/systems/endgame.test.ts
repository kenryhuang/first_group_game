import { describe, expect, it } from "vitest";
import type { RunState } from "../domain/types";
import { createRunState } from "./runState";
import {
  FINAL_BOSS_DEFINITION,
  FINAL_BOSS_PHASE_FOUR_SKILL,
  FINAL_BOSS_PHASE_ONE_SKILL,
  FINAL_BOSS_PHASE_THREE_SKILL,
  FINAL_BOSS_PHASE_TWO_SKILL,
  getEndgameUltimateDefinition,
  getFinalBossPhase,
  getWarCoreDefeatOutcome,
  getWarCoreEvacuationOutcome,
  isEndgameReady,
  shouldAllowWarCoreSpawn,
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

  it("tracks the city authority war core through four absolute-health phases", () => {
    expect(FINAL_BOSS_DEFINITION.maxHealth).toBe(10000);
    expect(FINAL_BOSS_DEFINITION.name).toBe("失控战争核心");
    expect(getFinalBossPhase(9000)).toBe(1);
    expect(getFinalBossPhase(7000)).toBe(2);
    expect(getFinalBossPhase(5000)).toBe(3);
    expect(getFinalBossPhase(2000)).toBe(4);
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

  it("defines phase four as the underground armory and collapse evacuation", () => {
    expect(FINAL_BOSS_PHASE_FOUR_SKILL.armoryWidth).toBeGreaterThanOrEqual(1800);
    expect(FINAL_BOSS_PHASE_FOUR_SKILL.armoryHeight).toBeGreaterThanOrEqual(1200);
    expect(FINAL_BOSS_PHASE_FOUR_SKILL.pressureTickMs).toBeLessThanOrEqual(900);
    expect(FINAL_BOSS_PHASE_FOUR_SKILL.barrageDamage).toBeGreaterThan(0);
    expect(FINAL_BOSS_PHASE_FOUR_SKILL.collapseEscapeMs).toBeGreaterThanOrEqual(20000);
    expect(FINAL_BOSS_PHASE_FOUR_SKILL.exitRadius).toBeGreaterThanOrEqual(80);
  });

  it("resolves underground armory evacuation by timer and exit distance", () => {
    expect(getWarCoreEvacuationOutcome({ collapseMs: 1000, distanceToExit: 40, exitRadius: 90 })).toBe("escaped");
    expect(getWarCoreEvacuationOutcome({ collapseMs: 1000, distanceToExit: 120, exitRadius: 90 })).toBe("still-running");
    expect(getWarCoreEvacuationOutcome({ collapseMs: 0, distanceToExit: 120, exitRadius: 90 })).toBe("buried");
  });

  it("starts collapse instead of immediately ending when the phase four core is destroyed in the armory", () => {
    expect(getWarCoreDefeatOutcome({ phase: 4, armoryActive: true, collapseMs: 0 })).toBe("start-collapse");
    expect(getWarCoreDefeatOutcome({ phase: 4, armoryActive: true, collapseMs: 1000 })).toBe("mission-success");
    expect(getWarCoreDefeatOutcome({ phase: 3, armoryActive: true, collapseMs: 0 })).toBe("mission-success");
    expect(getWarCoreDefeatOutcome({ phase: 4, armoryActive: false, collapseMs: 0 })).toBe("mission-success");
  });

  it("does not respawn the war core during the underground armory sequence", () => {
    expect(shouldAllowWarCoreSpawn({ armoryActive: false, collapseMs: 0 })).toBe(true);
    expect(shouldAllowWarCoreSpawn({ armoryActive: true, collapseMs: 0 })).toBe(false);
    expect(shouldAllowWarCoreSpawn({ armoryActive: true, collapseMs: 1000 })).toBe(false);
  });
});
