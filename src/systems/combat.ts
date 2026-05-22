import { SKILLS } from "../data/prototypeData";
import type { BossDefeatReward, BossDefinition, EnemyState, SkillUseResult } from "../domain/types";
import { getExperienceForNextLevel } from "./progression";

export function createEnemy(id: string, name: string, health: number, damage: number): EnemyState {
  return {
    id,
    name,
    health,
    maxHealth: health,
    damage,
    defeated: false,
  };
}

export function applyDamage(enemy: EnemyState, amount: number): EnemyState {
  const health = Math.max(0, enemy.health - amount);
  return {
    ...enemy,
    health,
    defeated: health === 0,
  };
}

export function useSkill(skillId: string, damageMultiplier: number): SkillUseResult {
  const skill = SKILLS.find((candidate) => candidate.id === skillId);
  if (!skill) {
    return { skillId, damage: 0, temporaryPollution: 0, tags: [] };
  }
  return {
    skillId,
    damage: Math.round(skill.damage * damageMultiplier),
    temporaryPollution: skill.temporaryPollution,
    tags: skill.tags,
  };
}

export function defeatBoss(boss: BossDefinition): BossDefeatReward {
  return {
    bossId: boss.id,
    specialItemId: boss.specialItem.id,
    stagePollution: boss.specialItem.stagePollution,
    experience: getExperienceForNextLevel(boss.descentLevel),
  };
}
