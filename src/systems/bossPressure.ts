import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId, BossPressureState } from "../domain/types";
import { getMilestoneBossId } from "./progression";

export function createBossPressureState(): BossPressureState {
  return {
    activeHunterId: null,
    pendingBossIds: [],
    killedBossIds: [],
    triggeredMilestones: [],
    resolvedMilestones: [],
  };
}

export function processLevelMilestone(state: BossPressureState, level: number): BossPressureState {
  const bossId = getMilestoneBossId(level);
  if (!bossId || state.triggeredMilestones.includes(level) || state.resolvedMilestones.includes(level)) {
    return state;
  }

  if (state.killedBossIds.includes(bossId)) {
    return {
      ...state,
      resolvedMilestones: [...state.resolvedMilestones, level],
    };
  }

  if (state.activeHunterId) {
    return {
      ...state,
      pendingBossIds: state.pendingBossIds.includes(bossId)
        ? state.pendingBossIds
        : [...state.pendingBossIds, bossId],
      triggeredMilestones: [...state.triggeredMilestones, level],
    };
  }

  return {
    ...state,
    activeHunterId: bossId,
    triggeredMilestones: [...state.triggeredMilestones, level],
  };
}

export function markBossKilled(state: BossPressureState, bossId: BossId): BossPressureState {
  const killedBossIds = state.killedBossIds.includes(bossId)
    ? state.killedBossIds
    : [...state.killedBossIds, bossId];
  const pendingBossIds = state.pendingBossIds.filter((candidate) => candidate !== bossId);
  const activeHunterId = state.activeHunterId === bossId ? pendingBossIds[0] ?? null : state.activeHunterId;
  const nextPending = state.activeHunterId === bossId ? pendingBossIds.slice(1) : pendingBossIds;
  const boss = BOSS_ORDER.find((candidate) => candidate.id === bossId);
  const resolvedMilestones = boss
    ? Array.from(new Set([...state.resolvedMilestones, boss.descentLevel]))
    : state.resolvedMilestones;

  return {
    ...state,
    activeHunterId,
    pendingBossIds: nextPending,
    killedBossIds,
    resolvedMilestones,
  };
}
