import type { BossId } from "../domain/types";

export type BossRushScenarioId =
  | "duel-chef"
  | "duel-clown"
  | "duel-courier"
  | "duel-hospital-knight"
  | "duel-beastmaster"
  | "duel-plague-doctor"
  | "duel-tesla-engineer"
  | "duel-magician"
  | "duel-war-convoy"
  | "duel-war-core"
  | "final-war"
  | "kitchen-brawl"
  | "sniper-crossfire"
  | "holy-judgment"
  | "circus-show";

export type BossRushEntryKind = "roamingBoss" | "finalBoss" | "hospitalKnight" | "eliteBone";

export interface BossRushEntry {
  kind: BossRushEntryKind;
  bossId?: BossId;
  count: number;
  health?: number;
  phase?: 1 | 2 | 3;
}

export interface BossRushScenario {
  id: BossRushScenarioId;
  name: string;
  description: string;
  entries: BossRushEntry[];
  playerLevel?: number;
}

export const BOSS_RUSH_SINGLE_DUELS: BossRushScenario[] = [
  {
    id: "duel-chef",
    name: "单挑：变异厨师",
    description: "单挑近战压迫 Boss：油污、火焰、菜刀冲砍。",
    playerLevel: 5,
    entries: [{ kind: "roamingBoss", bossId: "chef", count: 1 }],
  },
  {
    id: "duel-clown",
    name: "单挑：变异小丑",
    description: "单挑弹幕干扰 Boss：爆弹、恐惧圈、假身。",
    playerLevel: 10,
    entries: [{ kind: "roamingBoss", bossId: "clown", count: 1 }],
  },
  {
    id: "duel-courier",
    name: "单挑：变异快递员",
    description: "单挑高速突进 Boss：冲锋、爆炸包裹、路线封锁。",
    playerLevel: 15,
    entries: [{ kind: "roamingBoss", bossId: "courier", count: 1 }],
  },
  {
    id: "duel-hospital-knight",
    name: "单挑：白骨骑士",
    description: "单挑召唤与审判 Boss：骨兵、护盾、圣光斩。",
    playerLevel: 20,
    entries: [{ kind: "hospitalKnight", count: 1, phase: 2 }],
  },
  {
    id: "duel-beastmaster",
    name: "单挑：驯兽师",
    description: "单挑召唤 Boss：大量召唤变异生物，并让兽群列阵轮波进攻。",
    playerLevel: 25,
    entries: [{ kind: "roamingBoss", bossId: "beastmaster", count: 1 }],
  },
  {
    id: "duel-plague-doctor",
    name: "单挑：毒雾医师",
    description: "单挑污染控制 Boss：毒雾、回血针剂、感染病患。",
    playerLevel: 30,
    entries: [{ kind: "roamingBoss", bossId: "plague-doctor", count: 1 }],
  },
  {
    id: "duel-tesla-engineer",
    name: "单挑：磁暴工程师",
    description: "单挑机关控制 Boss：炮塔、电网、磁吸地雷。",
    playerLevel: 35,
    entries: [{ kind: "roamingBoss", bossId: "tesla-engineer", count: 1 }],
  },
  {
    id: "duel-magician",
    name: "单挑：魔术师",
    description: "单挑幻象干扰 Boss：分身、魔盒、魔术帽无敌窗口。",
    playerLevel: 40,
    entries: [{ kind: "roamingBoss", bossId: "magician", count: 1 }],
  },
  {
    id: "duel-war-convoy",
    name: "单挑：军火车队",
    description: "单挑大型机械 Boss：导弹雨、机枪扫射、碾压路线。",
    playerLevel: 45,
    entries: [{ kind: "roamingBoss", bossId: "war-convoy", count: 1 }],
  },
  {
    id: "duel-war-core",
    name: "单挑：失控战争核心",
    description: "单挑最终 Boss：失控 AI 调动城市资源和军火。",
    playerLevel: 50,
    entries: [{ kind: "finalBoss", count: 1 }],
  },
];

export const BOSS_RUSH_CHALLENGE_SCENARIOS: BossRushScenario[] = [
  {
    id: "final-war",
    name: "终焉之战",
    description: "满级机甲同时挑战厨师、小丑、快递员、骑士与失控战争核心。",
    entries: [
      { kind: "roamingBoss", bossId: "chef", count: 1 },
      { kind: "roamingBoss", bossId: "clown", count: 1 },
      { kind: "roamingBoss", bossId: "courier", count: 1 },
      { kind: "hospitalKnight", count: 1 },
      { kind: "finalBoss", count: 1 },
    ],
  },
  {
    id: "kitchen-brawl",
    name: "厨房混战",
    description: "一个玩家挑战 6 个变异厨师。",
    entries: [{ kind: "roamingBoss", bossId: "chef", count: 6 }],
  },
  {
    id: "sniper-crossfire",
    name: "远程狙击",
    description: "中央 50000 血快递员与四角失控核心炮台交叉压制。",
    entries: [
      { kind: "roamingBoss", bossId: "courier", count: 1, health: 50000 },
      { kind: "finalBoss", count: 4, health: 3000, phase: 1 },
    ],
  },
  {
    id: "holy-judgment",
    name: "圣光审判",
    description: "3 个二阶段骑士与 60 个白骨精英怪。",
    entries: [
      { kind: "hospitalKnight", count: 3, health: 4000, phase: 2 },
      { kind: "eliteBone", count: 60 },
    ],
  },
  {
    id: "circus-show",
    name: "杂技表演",
    description: "20 个 100 血变异小丑围攻玩家。",
    entries: [{ kind: "roamingBoss", bossId: "clown", count: 20, health: 100 }],
  },
];

export const BOSS_RUSH_SCENARIOS: BossRushScenario[] = [
  ...BOSS_RUSH_SINGLE_DUELS,
  ...BOSS_RUSH_CHALLENGE_SCENARIOS,
];

export function getBossRushScenario(id: BossRushScenarioId): BossRushScenario {
  const scenario = BOSS_RUSH_SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) {
    throw new Error(`Unknown Boss Rush scenario: ${id}`);
  }
  return scenario;
}

export function getBossRushPlayerLevel(id: BossRushScenarioId): number {
  return getBossRushScenario(id).playerLevel ?? 50;
}
