export type BossId = "chef" | "clown" | "courier";
export type SkillTag =
  | "melee"
  | "fire"
  | "oil"
  | "projectile"
  | "fear"
  | "dash"
  | "throw"
  | "explosive";

export interface PlayerBaseline {
  maxHealth: number;
  moveSpeed: number;
  basicDamage: number;
  basicAttackIntervalMs: number;
  pickupRadius: number;
  startingPollution: number;
  safePollutionLoad: number;
}

export interface PrototypeLimits {
  levelCap: number;
  activeSkillSlots: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  cooldownMs: number;
  damage: number;
  temporaryPollution: number;
  tags: SkillTag[];
}

export interface PassiveFragment {
  id: string;
  name: string;
  pollutionLoad: number;
  description: string;
  tags: SkillTag[];
}

export interface EliteDefinition {
  id: string;
  name: string;
  bossId: BossId;
  healthMultiplier: number;
  damageMultiplier: number;
}

export interface BossDefinition {
  id: BossId;
  name: string;
  descentLevel: number;
  maxHealth: number;
  role: string;
  specialItem: {
    id: string;
    name: string;
    stagePollution: number;
  };
  eliteIds: string[];
  rewardTags: SkillTag[];
}

export interface ProgressState {
  level: number;
  experience: number;
}

export interface ExperienceGainResult extends ProgressState {
  levelsGained: number[];
}

export interface PollutionState {
  passiveLoad: number;
  temporaryPollution: number;
  stagePollution: number;
}

export interface PollutionTotals extends PollutionState {
  total: number;
  overSafeLoad: boolean;
}

export interface PollutionBand {
  label: "calm" | "charged" | "unstable" | "dangerous" | "overrun";
  damageMultiplier: number;
  cooldownMultiplier: number;
  monsterSenseMultiplier: number;
  hordeDensityMultiplier: number;
  eventDanger: boolean;
  fakeResourcePoints: boolean;
  bossEmpowered: boolean;
}
