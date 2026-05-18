import type {
  BossDefinition,
  EliteDefinition,
  PassiveFragment,
  PlayerBaseline,
  PrototypeLimits,
  SkillDefinition,
} from "../domain/types";

export const PROTOTYPE_LIMITS: PrototypeLimits = {
  levelCap: 30,
  activeSkillSlots: 4,
};

export const PLAYER_BASELINE: PlayerBaseline = {
  maxHealth: 100,
  moveSpeed: 5,
  basicDamage: 10,
  basicAttackIntervalMs: 600,
  pickupRadius: 2.5,
  startingPollution: 0,
  safePollutionLoad: 100,
};

export const SKILLS: SkillDefinition[] = [
  {
    id: "cleaver-dash",
    name: "菜刀冲刺",
    cooldownMs: 4200,
    damage: 42,
    temporaryPollution: 3,
    tags: ["melee", "dash"],
  },
  {
    id: "oil-flame",
    name: "油污火焰",
    cooldownMs: 6200,
    damage: 55,
    temporaryPollution: 6,
    tags: ["fire", "oil"],
  },
  {
    id: "balloon-barrage",
    name: "气球弹幕",
    cooldownMs: 3600,
    damage: 34,
    temporaryPollution: 4,
    tags: ["projectile", "fear"],
  },
  {
    id: "explosive-parcel",
    name: "爆炸包裹",
    cooldownMs: 5200,
    damage: 64,
    temporaryPollution: 7,
    tags: ["throw", "explosive"],
  },
];

export const PASSIVE_FRAGMENTS: PassiveFragment[] = [
  {
    id: "greasy-edge",
    name: "油污刀锋",
    pollutionLoad: 15,
    description: "近战和火焰技能伤害提高。",
    tags: ["melee", "fire", "oil"],
  },
  {
    id: "delayed-laugh",
    name: "延迟笑声",
    pollutionLoad: 20,
    description: "投射物命中后追加一次小爆炸。",
    tags: ["projectile", "fear", "explosive"],
  },
  {
    id: "express-route",
    name: "急件路线",
    pollutionLoad: 25,
    description: "冲刺和投掷技能冷却缩短。",
    tags: ["dash", "throw"],
  },
];

export const ELITES: EliteDefinition[] = [
  { id: "butcher-apprentice", name: "剁肉学徒", bossId: "chef", healthMultiplier: 6, damageMultiplier: 1.6 },
  { id: "oil-carrier", name: "油锅搬运工", bossId: "chef", healthMultiplier: 5, damageMultiplier: 1.5 },
  { id: "balloon-gunner", name: "气球枪手", bossId: "clown", healthMultiplier: 5, damageMultiplier: 1.8 },
  { id: "bomb-doll", name: "炸弹玩偶", bossId: "clown", healthMultiplier: 6, damageMultiplier: 1.7 },
  { id: "parcel-rider", name: "爆包骑手", bossId: "courier", healthMultiplier: 6, damageMultiplier: 1.8 },
  { id: "route-blocker", name: "路线封锁员", bossId: "courier", healthMultiplier: 7, damageMultiplier: 1.5 },
];

export const BOSS_ORDER: BossDefinition[] = [
  {
    id: "chef",
    name: "变异厨师",
    descentLevel: 10,
    maxHealth: 3500,
    role: "高血量、低移速的硬压迫 Boss",
    specialItem: { id: "flesh-recipe", name: "血肉菜谱", stagePollution: 15 },
    eliteIds: ["butcher-apprentice", "oil-carrier"],
    rewardTags: ["melee", "fire", "oil"],
  },
  {
    id: "clown",
    name: "变异小丑",
    descentLevel: 20,
    maxHealth: 5500,
    role: "低血量、高远程压力 Boss",
    specialItem: { id: "cracked-smile-mask", name: "裂笑面具", stagePollution: 15 },
    eliteIds: ["balloon-gunner", "bomb-doll"],
    rewardTags: ["projectile", "fear", "explosive"],
  },
  {
    id: "courier",
    name: "变异快递员",
    descentLevel: 30,
    maxHealth: 8500,
    role: "高速冲撞与爆炸包裹 Boss",
    specialItem: { id: "bloodstained-waybill", name: "染血运单", stagePollution: 15 },
    eliteIds: ["parcel-rider", "route-blocker"],
    rewardTags: ["dash", "throw", "explosive"],
  },
];
