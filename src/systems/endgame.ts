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

export function getFinalBossPhase(health: number, _maxHealth = FINAL_BOSS_DEFINITION.maxHealth): 1 | 2 | 3 {
  if (health <= 5000) return 3;
  if (health <= 7000) return 2;
  return 1;
}
