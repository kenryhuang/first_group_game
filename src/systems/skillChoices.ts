import { SKILL_UPGRADES } from "../data/prototypeData";
import type { SkillChoiceProgress, SkillUpgradeStats } from "../domain/types";

export const KILLS_PER_SKILL_CHOICE = 15;

export function getCompletedSkillUpgradeCount(ranks: Record<string, number>): number {
  return Object.values(ranks).reduce((total, rank) => total + Math.max(0, Math.floor(rank)), 0);
}

export function getKillsRequiredForSkillChoice(completedSkillChoices: number): number {
  const completedChoices = Math.max(0, Math.floor(completedSkillChoices));
  return KILLS_PER_SKILL_CHOICE + (completedChoices * (completedChoices + 1)) / 2;
}

export function createSkillChoiceProgress(): SkillChoiceProgress {
  return {
    enemyKills: 0,
    killsTowardSkillChoice: 0,
    pendingSkillChoiceIds: [],
    skillUpgradeRanks: {},
  };
}

export function recordSkillChoiceKill(
  progress: SkillChoiceProgress,
  random: () => number = Math.random,
  requiredKills = KILLS_PER_SKILL_CHOICE,
): SkillChoiceProgress {
  const enemyKills = progress.enemyKills + 1;
  if (progress.pendingSkillChoiceIds.length > 0) {
    return { ...progress, enemyKills };
  }

  const killsTowardSkillChoice = progress.killsTowardSkillChoice + 1;
  if (killsTowardSkillChoice < requiredKills) {
    return { ...progress, enemyKills, killsTowardSkillChoice };
  }

  return {
    ...progress,
    enemyKills,
    killsTowardSkillChoice: 0,
    pendingSkillChoiceIds: rollSkillChoices(progress.skillUpgradeRanks, random),
  };
}

export function rollSkillChoices(
  ranks: Record<string, number>,
  random: () => number = Math.random,
): string[] {
  const pool = SKILL_UPGRADES.filter((upgrade) => (ranks[upgrade.id] ?? 0) < upgrade.maxRank);
  const choices: string[] = [];
  const available = [...pool];

  while (choices.length < 3 && available.length > 0) {
    const index = Math.min(available.length - 1, Math.floor(random() * available.length));
    const [choice] = available.splice(index, 1);
    choices.push(choice.id);
  }

  return choices;
}

export function applySkillUpgrade(
  progress: SkillChoiceProgress,
  upgradeId: string,
): SkillChoiceProgress {
  const definition = SKILL_UPGRADES.find((upgrade) => upgrade.id === upgradeId);
  if (!definition) {
    return progress;
  }

  const currentRank = progress.skillUpgradeRanks[upgradeId] ?? 0;
  if (currentRank >= definition.maxRank) {
    return { ...progress, pendingSkillChoiceIds: [] };
  }

  return {
    ...progress,
    pendingSkillChoiceIds: [],
    skillUpgradeRanks: {
      ...progress.skillUpgradeRanks,
      [upgradeId]: currentRank + 1,
    },
  };
}

export function getSkillUpgradeStats(ranks: Record<string, number>): SkillUpgradeStats {
  const stats: SkillUpgradeStats = {
    basicDamageBonus: 0,
    attackIntervalMultiplier: 1,
    pickupRadiusBonus: 0,
    maxHealthBonus: 0,
    moveSpeedMultiplier: 1,
    skillDamageMultiplier: 1,
  };

  for (const upgrade of SKILL_UPGRADES) {
    const rank = ranks[upgrade.id] ?? 0;
    if (rank <= 0) continue;

    stats.basicDamageBonus += (upgrade.effect.basicDamageBonus ?? 0) * rank;
    stats.pickupRadiusBonus += (upgrade.effect.pickupRadiusBonus ?? 0) * rank;
    stats.maxHealthBonus += (upgrade.effect.maxHealthBonus ?? 0) * rank;
    stats.attackIntervalMultiplier *= Math.pow(upgrade.effect.attackIntervalMultiplier ?? 1, rank);
    stats.moveSpeedMultiplier *= Math.pow(upgrade.effect.moveSpeedMultiplier ?? 1, rank);
    stats.skillDamageMultiplier *= Math.pow(upgrade.effect.skillDamageMultiplier ?? 1, rank);
  }

  return stats;
}
