import { SKILL_UPGRADES } from "../data/prototypeData";
import type { MechFormId } from "../domain/types";

export const MECH_FORM_UNLOCK_LEVEL = 50;
export const MECH_FORM_MIN_SCORE = 3;

export interface MechFormScores {
  laser: number;
  missile: number;
  blade: number;
}

export interface UltimateDefinition {
  formId: MechFormId;
  name: string;
  cooldownMs: number;
  damage: number;
  radius: number;
}

export const ULTIMATE_DEFINITIONS: Record<MechFormId, UltimateDefinition> = {
  laser: {
    formId: "laser",
    name: "天基裁决光束",
    cooldownMs: 22000,
    damage: 120,
    radius: 120,
  },
  missile: {
    formId: "missile",
    name: "末日饱和轰炸",
    cooldownMs: 24000,
    damage: 86,
    radius: 150,
  },
  blade: {
    formId: "blade",
    name: "热熔斩舰刀",
    cooldownMs: 18000,
    damage: 150,
    radius: 210,
  },
};

export function getMechFormScores(ranks: Record<string, number>): MechFormScores {
  const scores: MechFormScores = { laser: 0, missile: 0, blade: 0 };
  for (const upgrade of SKILL_UPGRADES) {
    const rank = ranks[upgrade.id] ?? 0;
    if (rank <= 0) continue;
    for (const tag of upgrade.formTags ?? []) {
      scores[tag] += rank;
    }
  }
  return scores;
}

export function getDominantMechForm(scores: MechFormScores): MechFormId {
  const entries = Object.entries(scores) as Array<[MechFormId, number]>;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function getAvailableMechForms(level: number, ranks: Record<string, number>): MechFormId[] {
  if (level < MECH_FORM_UNLOCK_LEVEL) return [];
  const scores = getMechFormScores(ranks);
  const available = (Object.keys(scores) as MechFormId[]).filter((formId) => scores[formId] >= MECH_FORM_MIN_SCORE);
  return available.length > 0 ? available : [getDominantMechForm(scores)];
}

export function getUltimateDefinition(formId: MechFormId): UltimateDefinition {
  return ULTIMATE_DEFINITIONS[formId];
}
