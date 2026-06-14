import type { BossId } from "../domain/types";

export type AdvancedBossSkillId =
  | "chili-oil-cover"
  | "crash-landing"
  | "meat-grinder"
  | "hidden-magic-box"
  | "knife-burst"
  | "surprise-drop"
  | "spiral-knife-ultimate"
  | "delivery-route"
  | "explosive-parcel"
  | "locker-teleport"
  | "signature-lock"
  | "citywide-delivery"
  | "zombie-siege"
  | "hound-rush"
  | "beast-unstoppable"
  | "stampede-command"
  | "total-frenzy"
  | "toxic-cloud"
  | "infected-patients"
  | "sedative-dart"
  | "infusion-stand"
  | "quarantine-ward"
  | "tesla-turret"
  | "magnetic-mine"
  | "electric-grid"
  | "overload-repair"
  | "blackout-field"
  | "curtain-shift"
  | "spotlight-judgement"
  | "hat-maze"
  | "mirror-hall"
  | "finale-theater"
  | "commander-deploy"
  | "armored-corridor"
  | "escort-crossfire"
  | "ammo-truck-sacrifice"
  | "iron-encirclement";

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
  beastmaster: { maxHealth: 5200, skillCooldownMs: 3800 },
  "plague-doctor": { maxHealth: 5600, skillCooldownMs: 4000 },
  "tesla-engineer": { maxHealth: 6200, skillCooldownMs: 3600 },
  magician: { maxHealth: 6500, skillCooldownMs: 3300 },
  "war-convoy": { maxHealth: 11000, skillCooldownMs: 3000 },
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
  { id: "commander-deploy", bossId: "war-convoy", name: "统领车布阵", role: "summon", warningMs: 650, damage: 10, radius: 320 },
  { id: "armored-corridor", bossId: "war-convoy", name: "装甲火力走廊", role: "charge", warningMs: 850, damage: 26, radius: 9999 },
  { id: "escort-crossfire", bossId: "war-convoy", name: "护卫车交叉扫射", role: "projectile", warningMs: 700, damage: 9, radius: 9999 },
  { id: "ammo-truck-sacrifice", bossId: "war-convoy", name: "弹药车殉爆", role: "summon", warningMs: 720, damage: 30, radius: 260 },
  { id: "iron-encirclement", bossId: "war-convoy", name: "钢铁合围", role: "area", warningMs: 1000, damage: 36, radius: 9999 },

  { id: "chili-oil-cover", bossId: "chef", name: "辣椒油覆盖", role: "area", warningMs: 650, damage: 8, radius: 92 },
  { id: "crash-landing", bossId: "chef", name: "坠机", role: "area", warningMs: 950, damage: 34, radius: 220 },
  { id: "meat-grinder", bossId: "chef", name: "绞肉机", role: "lock", warningMs: 700, damage: 10, radius: 220 },

  { id: "hidden-magic-box", bossId: "clown", name: "魔盒突袭", role: "area", warningMs: 650, damage: 1, radius: 78 },
  { id: "knife-burst", bossId: "clown", name: "飞刀攻击", role: "projectile", warningMs: 500, damage: 9, radius: 9999 },
  { id: "surprise-drop", bossId: "clown", name: "惊喜降临", role: "charge", warningMs: 650, damage: 13, radius: 94 },
  { id: "spiral-knife-ultimate", bossId: "clown", name: "环形飞刀", role: "projectile", warningMs: 700, damage: 8, radius: 9999 },

  { id: "delivery-route", bossId: "courier", name: "订单路线", role: "charge", warningMs: 650, damage: 24, radius: 120 },
  { id: "explosive-parcel", bossId: "courier", name: "爆装包裹", role: "area", warningMs: 700, damage: 18, radius: 96 },
  { id: "locker-teleport", bossId: "courier", name: "快递柜传送", role: "lock", warningMs: 760, damage: 22, radius: 110 },
  { id: "signature-lock", bossId: "courier", name: "签收锁定", role: "area", warningMs: 720, damage: 30, radius: 150 },
  { id: "citywide-delivery", bossId: "courier", name: "全城派送", role: "projectile", warningMs: 850, damage: 10, radius: 9999 },

  { id: "zombie-siege", bossId: "beastmaster", name: "尸潮来袭", role: "summon", warningMs: 650, damage: 8, radius: 520 },
  { id: "hound-rush", bossId: "beastmaster", name: "猎狗奔袭", role: "summon", warningMs: 520, damage: 6, radius: 460 },
  { id: "beast-unstoppable", bossId: "beastmaster", name: "全体霸体", role: "lock", warningMs: 450, damage: 1, radius: 900 },
  { id: "stampede-command", bossId: "beastmaster", name: "冲冲冲", role: "charge", warningMs: 620, damage: 16, radius: 820 },
  { id: "total-frenzy", bossId: "beastmaster", name: "彻底暴走", role: "summon", warningMs: 900, damage: 12, radius: 760 },

  {
    id: "toxic-cloud",
    bossId: "plague-doctor",
    name: "毒雾扩散",
    role: "area",
    warningMs: 900,
    damage: 12,
    radius: 170,
    lowHealthThreshold: 1800,
    lowHealthDamage: 18,
  },
  { id: "infected-patients", bossId: "plague-doctor", name: "感染病患", role: "summon", warningMs: 620, damage: 7, radius: 160 },
  { id: "sedative-dart", bossId: "plague-doctor", name: "镇静针", role: "projectile", warningMs: 520, damage: 10, radius: 9999 },
  { id: "infusion-stand", bossId: "plague-doctor", name: "污染输液架", role: "lock", warningMs: 700, damage: 8, radius: 220 },
  { id: "quarantine-ward", bossId: "plague-doctor", name: "隔离病房", role: "area", warningMs: 900, damage: 20, radius: 9999 },

  { id: "tesla-turret", bossId: "tesla-engineer", name: "磁暴炮塔", role: "projectile", warningMs: 540, damage: 26, radius: 9999 },
  { id: "magnetic-mine", bossId: "tesla-engineer", name: "磁吸地雷", role: "area", warningMs: 780, damage: 20, radius: 130 },
  { id: "electric-grid", bossId: "tesla-engineer", name: "电网连线", role: "lock", warningMs: 650, damage: 12, radius: 9999 },
  { id: "overload-repair", bossId: "tesla-engineer", name: "过载维修", role: "lock", warningMs: 720, damage: 8, radius: 420 },
  { id: "blackout-field", bossId: "tesla-engineer", name: "全场断电", role: "area", warningMs: 900, damage: 28, radius: 9999 },

  { id: "curtain-shift", bossId: "magician", name: "幕布换场", role: "area", warningMs: 700, damage: 16, radius: 240 },
  { id: "spotlight-judgement", bossId: "magician", name: "聚光灯审判", role: "area", warningMs: 850, damage: 22, radius: 210 },
  { id: "hat-maze", bossId: "magician", name: "礼帽迷宫", role: "lock", warningMs: 760, damage: 15, radius: 120 },
  { id: "mirror-hall", bossId: "magician", name: "镜厅分身", role: "summon", warningMs: 680, damage: 10, radius: 170 },
  { id: "finale-theater", bossId: "magician", name: "终幕剧场", role: "summon", warningMs: 900, damage: 18, radius: 9999 },

];

export function getAdvancedBossSkills(bossId: BossId): AdvancedBossSkill[] {
  return ADVANCED_BOSS_SKILLS.filter((skill) => skill.bossId === bossId);
}

export function getNextAdvancedBossSkill(bossId: BossId, cursor: number): AdvancedBossSkill {
  const skills = getAdvancedBossSkills(bossId);
  return skills[cursor % skills.length];
}
