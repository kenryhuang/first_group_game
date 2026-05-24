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
  maxHealth: 5000,
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

export function getFinalBossPhase(health: number, maxHealth: number): 1 | 2 | 3 {
  const ratio = maxHealth <= 0 ? 0 : health / maxHealth;
  if (ratio <= 0.35) return 3;
  if (ratio <= 0.7) return 2;
  return 1;
}
