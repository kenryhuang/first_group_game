import { BOSS_ORDER, PROTOTYPE_LIMITS } from "../data/prototypeData";
import type { BossId, ExperienceGainResult, ProgressState } from "../domain/types";

export function getExperienceForNextLevel(level: number): number {
  if (level <= 10) return 20 + level * 10;
  const levelProgress = (level - 11) / 19;
  return Math.round(140 + levelProgress * 280);
}

export function gainExperience(state: ProgressState, amount: number): ExperienceGainResult {
  let level = state.level;
  let experience = state.experience + amount;
  const levelsGained: number[] = [];

  while (level < PROTOTYPE_LIMITS.levelCap) {
    const threshold = getExperienceForNextLevel(level);
    if (experience < threshold) break;
    experience -= threshold;
    level += 1;
    levelsGained.push(level);
  }

  if (level >= PROTOTYPE_LIMITS.levelCap) {
    experience = 0;
  }

  return { level, experience, levelsGained };
}

export function getMilestoneBossId(level: number): BossId | null {
  return BOSS_ORDER.find((boss) => boss.descentLevel === level)?.id ?? null;
}
