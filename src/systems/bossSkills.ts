import type { BossId } from "../domain/types";

export type AdvancedBossSkillId =
  | "pressure-cooker-bomb"
  | "chopping-board-charge"
  | "cauldron-descend"
  | "jack-in-the-box"
  | "clone-trick"
  | "knife-gala"
  | "drone-airdrop"
  | "delivery-lock";

export type AdvancedBossSkillRole = "area" | "summon" | "charge" | "lock" | "projectile";

export interface AdvancedBossSkill {
  id: AdvancedBossSkillId;
  bossId: BossId;
  name: string;
  role: AdvancedBossSkillRole;
  warningMs: number;
  damage: number;
  radius: number;
  lowHealthThreshold?: number;
  lowHealthDamage?: number;
}

export const ROAMING_BOSS_RUNTIME_STATS = {
  chef: { maxHealth: 4000, skillCooldownMs: 3200 },
  clown: { maxHealth: 1000, skillCooldownMs: 4200 },
  courier: { maxHealth: 1550, skillCooldownMs: 3600 },
} as const;

export const BIG_FIRE_PIT = {
  radius: 300,
  lifeMs: 10000,
  tickMs: 1000,
  damage: 8,
} as const;

export const JESTER_BOX_EFFECTS = ["blast", "freeze", "vision"] as const;
export const COURIER_LOCKED_CHARGE_SPEED = 3000;

export const ADVANCED_BOSS_SKILLS: AdvancedBossSkill[] = [
  {
    id: "pressure-cooker-bomb",
    bossId: "chef",
    name: "高压爆破",
    role: "area",
    warningMs: 1200,
    damage: 18,
    radius: 112,
    lowHealthThreshold: 1000,
    lowHealthDamage: 10,
  },
  {
    id: "chopping-board-charge",
    bossId: "chef",
    name: "砧板冲锋",
    role: "charge",
    warningMs: 700,
    damage: 24,
    radius: 92,
  },
  {
    id: "cauldron-descend",
    bossId: "chef",
    name: "太锅降临",
    role: "area",
    warningMs: 1000,
    damage: 30,
    radius: 200,
  },
  {
    id: "jack-in-the-box",
    bossId: "clown",
    name: "惊吓魔盒",
    role: "area",
    warningMs: 950,
    damage: 16,
    radius: 96,
  },
  {
    id: "clone-trick",
    bossId: "clown",
    name: "分身戏法",
    role: "summon",
    warningMs: 500,
    damage: 6,
    radius: 120,
  },
  {
    id: "knife-gala",
    bossId: "clown",
    name: "华丽飞刀",
    role: "projectile",
    warningMs: 500,
    damage: 32,
    radius: 9999,
  },
  {
    id: "drone-airdrop",
    bossId: "courier",
    name: "无人机空投",
    role: "area",
    warningMs: 850,
    damage: 14,
    radius: 76,
  },
  {
    id: "delivery-lock",
    bossId: "courier",
    name: "快递单锁定",
    role: "lock",
    warningMs: 1050,
    damage: 26,
    radius: 120,
  },
];

export function getAdvancedBossSkills(bossId: BossId): AdvancedBossSkill[] {
  return ADVANCED_BOSS_SKILLS.filter((skill) => skill.bossId === bossId);
}

export function getNextAdvancedBossSkill(bossId: BossId, cursor: number): AdvancedBossSkill {
  const skills = getAdvancedBossSkills(bossId);
  return skills[cursor % skills.length];
}
