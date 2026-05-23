import type { BossId } from "../domain/types";

export type AdvancedBossSkillId =
  | "pressure-cooker-bomb"
  | "chopping-board-charge"
  | "jack-in-the-box"
  | "clone-trick"
  | "drone-airdrop"
  | "delivery-lock";

export type AdvancedBossSkillRole = "area" | "summon" | "charge" | "lock";

export interface AdvancedBossSkill {
  id: AdvancedBossSkillId;
  bossId: BossId;
  name: string;
  role: AdvancedBossSkillRole;
  warningMs: number;
  damage: number;
  radius: number;
}

export const ADVANCED_BOSS_SKILLS: AdvancedBossSkill[] = [
  {
    id: "pressure-cooker-bomb",
    bossId: "chef",
    name: "高压爆破",
    role: "area",
    warningMs: 1200,
    damage: 18,
    radius: 112,
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
