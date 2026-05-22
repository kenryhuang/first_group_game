import { PASSIVE_FRAGMENTS, PROTOTYPE_LIMITS } from "../data/prototypeData";

export function equipActiveSkill(activeSkillIds: string[], skillId: string): {
  activeSkillIds: string[];
  accepted: boolean;
} {
  if (activeSkillIds.includes(skillId)) {
    return { activeSkillIds, accepted: false };
  }
  if (activeSkillIds.length >= PROTOTYPE_LIMITS.activeSkillSlots) {
    return { activeSkillIds, accepted: false };
  }
  return { activeSkillIds: [...activeSkillIds, skillId], accepted: true };
}

export function equipPassiveFragment(passiveFragmentIds: string[], fragmentId: string): {
  passiveFragmentIds: string[];
  passiveLoad: number;
  accepted: boolean;
} {
  if (passiveFragmentIds.includes(fragmentId)) {
    return {
      passiveFragmentIds,
      passiveLoad: getPassiveLoad(passiveFragmentIds),
      accepted: false,
    };
  }
  const next = [...passiveFragmentIds, fragmentId];
  return {
    passiveFragmentIds: next,
    passiveLoad: getPassiveLoad(next),
    accepted: true,
  };
}

export function getPassiveLoad(passiveFragmentIds: string[]): number {
  return passiveFragmentIds.reduce((sum, id) => {
    const fragment = PASSIVE_FRAGMENTS.find((item) => item.id === id);
    return sum + (fragment?.pollutionLoad ?? 0);
  }, 0);
}
