import { BOSS_ORDER, PLAYER_BASELINE } from "../data/prototypeData";
import type { BossId, RunState } from "../domain/types";
import { processLevelMilestone, createBossPressureState, markBossKilled } from "./bossPressure";
import { defeatBoss, useSkill } from "./combat";
import { createExplorationState, resolveMapNode } from "./exploration";
import { equipActiveSkill, equipPassiveFragment, getPassiveLoad } from "./loadout";
import { MECH_FORM_UNLOCK_LEVEL, getAvailableMechForms } from "./mechForms";
import { gainExperience } from "./progression";
import {
  applySkillUpgrade,
  createSkillChoiceProgress,
  getCompletedSkillUpgradeCount,
  getKillsRequiredForSkillChoice,
  getSkillUpgradeStats,
  recordSkillChoiceKill,
} from "./skillChoices";

export function createRunState(): RunState {
  const skillChoiceProgress = createSkillChoiceProgress();
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
    selectedMechFormId: null,
    pendingMechFormIds: [],
    ...skillChoiceProgress,
  };
}

export function gainRunExperience(state: RunState, amount: number): RunState {
  const progress = gainExperience({ level: state.level, experience: state.experience }, amount);
  const bossPressure = progress.levelsGained.reduce(
    (pressure, level) => processLevelMilestone(pressure, level),
    state.bossPressure,
  );

  const maxHealth = getRunMaxHealth(progress.level, state.skillUpgradeRanks);
  const pendingMechFormIds =
    state.selectedMechFormId || state.pendingMechFormIds.length > 0
      ? state.pendingMechFormIds
      : getAvailableMechForms(progress.level, state.skillUpgradeRanks);

  return {
    ...state,
    level: progress.level,
    experience: progress.experience,
    maxHealth,
    baseDamage: Math.round(PLAYER_BASELINE.basicDamage * (1 + (progress.level - 1) * 0.03)),
    bossPressure,
    pendingMechFormIds,
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

export function recordRunEnemyKill(state: RunState, random: () => number = Math.random): RunState {
  const requiredKills = getKillsRequiredForSkillChoice(getCompletedSkillUpgradeCount(state.skillUpgradeRanks));
  const shouldOpenChoice =
    state.pendingSkillChoiceIds.length === 0 &&
    state.killsTowardSkillChoice + 1 >= requiredKills;
  const progress = recordSkillChoiceKill(state, random, requiredKills);
  const shouldOpenMechForm =
    shouldOpenChoice &&
    progress.pendingSkillChoiceIds.length === 0 &&
    !state.selectedMechFormId &&
    state.pendingMechFormIds.length === 0;

  return {
    ...state,
    ...progress,
    pendingMechFormIds: shouldOpenMechForm
      ? getAvailableMechForms(Math.max(state.level, MECH_FORM_UNLOCK_LEVEL), progress.skillUpgradeRanks)
      : state.pendingMechFormIds,
  };
}

export function chooseRunSkillUpgrade(state: RunState, upgradeId: string): RunState {
  if (!state.pendingSkillChoiceIds.includes(upgradeId)) {
    return state;
  }

  const previousMaxHealth = state.maxHealth;
  const progress = applySkillUpgrade(state, upgradeId);
  const maxHealth = getRunMaxHealth(state.level, progress.skillUpgradeRanks);

  return {
    ...state,
    ...progress,
    maxHealth,
    health: Math.min(maxHealth, state.health + Math.max(0, maxHealth - previousMaxHealth)),
  };
}

export function chooseRunMechForm(state: RunState, formId: RunState["selectedMechFormId"]): RunState {
  if (!formId || !state.pendingMechFormIds.includes(formId)) {
    return state;
  }
  return {
    ...state,
    selectedMechFormId: formId,
    pendingMechFormIds: [],
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

function getRunMaxHealth(level: number, skillUpgradeRanks: Record<string, number>): number {
  const stats = getSkillUpgradeStats(skillUpgradeRanks);
  return PLAYER_BASELINE.maxHealth + (level - 1) * 2 + stats.maxHealthBonus;
}
