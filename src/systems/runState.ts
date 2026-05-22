import { BOSS_ORDER, PLAYER_BASELINE } from "../data/prototypeData";
import type { BossId, RunState } from "../domain/types";
import { processLevelMilestone, createBossPressureState, markBossKilled } from "./bossPressure";
import { defeatBoss, useSkill } from "./combat";
import { createExplorationState, resolveMapNode } from "./exploration";
import { equipActiveSkill, equipPassiveFragment, getPassiveLoad } from "./loadout";
import { gainExperience } from "./progression";

export function createRunState(): RunState {
  return {
    level: 1,
    experience: 0,
    health: PLAYER_BASELINE.maxHealth,
    maxHealth: PLAYER_BASELINE.maxHealth,
    baseDamage: PLAYER_BASELINE.basicDamage,
    activeSkillIds: ["cleaver-dash"],
    passiveFragmentIds: [],
    specialItemIds: [],
    killedBossIds: [],
    passiveLoad: 0,
    temporaryPollution: PLAYER_BASELINE.startingPollution,
    stagePollution: 0,
    exploration: createExplorationState(),
    discoveredBossClues: [],
    bossPressure: createBossPressureState(),
  };
}

export function gainRunExperience(state: RunState, amount: number): RunState {
  const progress = gainExperience({ level: state.level, experience: state.experience }, amount);
  const bossPressure = progress.levelsGained.reduce(
    (pressure, level) => processLevelMilestone(pressure, level),
    state.bossPressure,
  );

  return {
    ...state,
    level: progress.level,
    experience: progress.experience,
    maxHealth: PLAYER_BASELINE.maxHealth + (progress.level - 1) * 2,
    baseDamage: Math.round(PLAYER_BASELINE.basicDamage * (1 + (progress.level - 1) * 0.03)),
    bossPressure,
  };
}

export function collectNode(state: RunState, nodeId: string): RunState {
  const result = resolveMapNode(state.exploration, nodeId);
  let next = gainRunExperience(
    {
      ...state,
      exploration: result.nextState,
      health: Math.min(state.maxHealth, state.health + result.rewards.healing),
      temporaryPollution: state.temporaryPollution + result.rewards.temporaryPollution,
      discoveredBossClues: Array.from(
        new Set([...state.discoveredBossClues, ...result.rewards.clueBossIds]),
      ),
    },
    result.rewards.experience,
  );

  for (const skillId of result.rewards.skillIds) {
    const equipped = equipActiveSkill(next.activeSkillIds, skillId);
    next = { ...next, activeSkillIds: equipped.activeSkillIds };
  }

  for (const fragmentId of result.rewards.passiveFragmentIds) {
    const equipped = equipPassiveFragment(next.passiveFragmentIds, fragmentId);
    next = {
      ...next,
      passiveFragmentIds: equipped.passiveFragmentIds,
      passiveLoad: equipped.passiveLoad,
    };
  }

  return next;
}

export function useRunSkill(state: RunState, skillId: string): RunState {
  const skill = useSkill(skillId, 1);
  return {
    ...state,
    temporaryPollution: state.temporaryPollution + skill.temporaryPollution,
  };
}

export function applyRunDamage(state: RunState, amount: number): RunState {
  return {
    ...state,
    health: Math.max(0, state.health - Math.max(0, Math.round(amount))),
  };
}

export function killRunBoss(state: RunState, bossId: BossId): RunState {
  const boss = BOSS_ORDER.find((candidate) => candidate.id === bossId);
  if (!boss || state.killedBossIds.includes(bossId)) {
    return state;
  }
  const reward = defeatBoss(boss);
  const killedBossIds = [...state.killedBossIds, bossId];
  const specialItemIds = [...state.specialItemIds, reward.specialItemId];

  return {
    ...gainRunExperience(state, reward.experience),
    killedBossIds,
    specialItemIds,
    passiveLoad: getPassiveLoad(state.passiveFragmentIds),
    stagePollution: state.stagePollution + reward.stagePollution,
    bossPressure: markBossKilled(state.bossPressure, bossId),
  };
}
