import type { MechFormId, RunState } from "../domain/types";

export const ENDGAME_LEVEL = 50;
export const REQUIRED_BOSS_KILLS_FOR_ENDGAME = 3;

export interface EndgameUltimateDefinition {
  formId: MechFormId;
  name: string;
  cooldownMs: number;
  damage: number;
  radius: number;
}

export interface FinalBossDefinition {
  id: "war-core";
  name: string;
  maxHealth: number;
}

export const FINAL_BOSS_DEFINITION: FinalBossDefinition = {
  id: "war-core",
  name: "失控战争核心",
  maxHealth: 10000,
};

export const FINAL_BOSS_PHASE_ONE_SKILL = {
  coreSpeed: 0,
  interferenceRadius: 15000,
  slowMs: 2600,
  slowMultiplier: 0.5,
  beamDelayMs: 1000,
  beamRadius: 48,
  beamRange: 15000,
  beamDamage: 18,
  buildingCollisionDamage: 10,
  buildingCollisionIntervalMs: 1000,
  buildingChargeDamage: 10,
  buildingChargeCooldownMs: 5000,
  buildingChargeRange: 360,
  buildingChargeSpeed: 1500,
};

export const FINAL_BOSS_PHASE_TWO_SKILL = {
  coreSpeed: 0,
  onlyExplosiveDamage: true,
  bombWarningMs: 2000,
  bombDamage: 42,
  bombMinRadius: 120,
  bombMaxRadius: 240,
  sniperBuildingCount: 2,
  sniperDamage: 32,
  sniperRange: 520,
  sniperCooldownMs: 1800,
};

export const FINAL_BOSS_PHASE_THREE_SKILL = {
  mechSpeed: 92,
  buildingWeaponDamage: 20,
  buildingWeaponRange: 560,
  buildingWeaponCooldownMs: 3000,
  buildingWeaponSpeed: 1800,
  orangeBeamDamage: 80,
  orangeBeamRadius: 72,
  orangeBeamRange: 15000,
  missileCount: 6,
  missileLockMs: 1500,
  missileDamage: 62,
  missileRadius: 92,
  crawlerCount: 5,
  crawlerDamage: 32,
  crawlerArmMs: 1000,
  crawlerExplosionRadius: 56,
  crawlerSpeedMultiplier: 2,
  suppressMs: 5000,
  finalBeamHealthThreshold: 1000,
};

export const FINAL_BOSS_PHASE_FOUR_SKILL = {
  armoryWidth: 2200,
  armoryHeight: 1500,
  coreSpeed: 68,
  pressureTickMs: 720,
  barrageDamage: 22,
  barrageRadius: 86,
  barrageWarningMs: 520,
  ammoRackDamage: 34,
  ammoRackRadius: 145,
  turretDamage: 12,
  turretProjectileSpeed: 620,
  collapseEscapeMs: 28000,
  collapseTickMs: 1000,
  collapseDamage: 10,
  exitRadius: 96,
} as const;

export const ENDGAME_ULTIMATE_DEFINITIONS: Record<MechFormId, EndgameUltimateDefinition> = {
  laser: {
    formId: "laser",
    name: "集天光柱",
    cooldownMs: 38000,
    damage: 420,
    radius: 380,
  },
  missile: {
    formId: "missile",
    name: "战术核弹",
    cooldownMs: 45000,
    damage: 680,
    radius: 960,
  },
  blade: {
    formId: "blade",
    name: "机甲变形",
    cooldownMs: 42000,
    damage: 260,
    radius: 420,
  },
};

export function isEndgameReady(state: RunState): boolean {
  if (!state.selectedMechFormId) return false;
  return state.level >= ENDGAME_LEVEL || state.killedBossIds.length >= REQUIRED_BOSS_KILLS_FOR_ENDGAME;
}

export function getEndgameUltimateDefinition(formId: MechFormId): EndgameUltimateDefinition {
  return ENDGAME_ULTIMATE_DEFINITIONS[formId];
}

export type FinalBossPhase = 1 | 2 | 3 | 4;

export function getFinalBossPhase(health: number, _maxHealth = FINAL_BOSS_DEFINITION.maxHealth): FinalBossPhase {
  if (health <= 2000) return 4;
  if (health <= 5000) return 3;
  if (health <= 7000) return 2;
  return 1;
}

export type WarCoreEvacuationOutcome = "escaped" | "buried" | "still-running";
export type WarCoreDefeatOutcome = "start-collapse" | "mission-success";

export function getWarCoreDefeatOutcome(input: {
  phase: FinalBossPhase;
  armoryActive: boolean;
  collapseMs: number;
}): WarCoreDefeatOutcome {
  if (input.phase === 4 && input.armoryActive && input.collapseMs <= 0) return "start-collapse";
  return "mission-success";
}

export function shouldAllowWarCoreSpawn(input: { armoryActive: boolean; collapseMs: number }): boolean {
  return !input.armoryActive && input.collapseMs <= 0;
}

export function getWarCoreEvacuationOutcome(input: {
  collapseMs: number;
  distanceToExit: number;
  exitRadius: number;
}): WarCoreEvacuationOutcome {
  if (input.distanceToExit <= input.exitRadius) return "escaped";
  if (input.collapseMs <= 0) return "buried";
  return "still-running";
}
