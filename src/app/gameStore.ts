import { defineStore } from "pinia";
import type { RunState } from "../domain/types";
import type { BossRushScenarioId } from "../systems/bossRush";
import { createRunState } from "../systems/runState";
import { MAP_HEIGHT, MAP_WIDTH } from "../systems/spawning";
import { BUILDINGS } from "../systems/terrain";
import { createHudLines } from "../ui/hud";

export type GamePhase = "menu" | "storyIntro" | "storyMechSelect" | "bossRushSelect" | "playing" | "gameOver" | "missionSuccess";
export type GameMode = "classic" | "story" | "bossRush";
export type StoryMechId = "vanguard" | "medic" | "engineer";

export interface GameMetrics {
  enemyCount: number;
  bossCount: number;
  bossHazardCount?: number;
  bulletCount: number;
  buildingCount: number;
  renderedBuildingCount?: number;
  mapWidth: number;
  mapHeight: number;
  attackMode: "auto" | "manual";
  bossName: string | null;
  bossNames: string[];
  insideBuilding: boolean;
  currentBuildingId: string | null;
  playerX?: number;
  playerY?: number;
  playerHealth: number;
  storyVisionRadius?: number;
  storyLitLighthouseCount?: number;
  storyMonsterPressureMultiplier?: number;
  storyMagicianInterferenceActive?: boolean;
  storyMagicianInterferenceCount?: number;
  selectedStoryMechId?: StoryMechId | null;
  storyArtSliceEnabled?: boolean;
  storyLighthouseVisualState?: "off" | "charging" | "on";
  storyArtSpriteCount?: number;
  story2_5dEnabled?: boolean;
  story2_5dGroundScaleY?: number;
  story2_5dPlayerScreenY?: number;
  story2_5dVolumePropCount?: number;
  story2_5dDepthSortedPropCount?: number;
  story2_5dProjectedUnderlayEnabled?: boolean;
}

interface GameStoreState extends GameMetrics {
  phase: GamePhase;
  mode: GameMode;
  selectedStoryMechId: StoryMechId | null;
  bossRushScenarioId: BossRushScenarioId | null;
  runState: RunState;
  message: string;
}

function createInitialMetrics(): GameMetrics {
  return {
    enemyCount: 0,
    bossCount: 0,
    bossHazardCount: 0,
    bulletCount: 0,
    buildingCount: BUILDINGS.length,
    renderedBuildingCount: 0,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    attackMode: "auto",
    bossName: null,
    bossNames: [],
    insideBuilding: false,
    currentBuildingId: null,
    playerX: undefined,
    playerY: undefined,
    playerHealth: createRunState().health,
    storyVisionRadius: undefined,
    storyLitLighthouseCount: undefined,
    storyMonsterPressureMultiplier: undefined,
    storyMagicianInterferenceActive: undefined,
    storyMagicianInterferenceCount: undefined,
    selectedStoryMechId: null,
    storyArtSliceEnabled: false,
    storyLighthouseVisualState: undefined,
    storyArtSpriteCount: undefined,
    story2_5dEnabled: false,
    story2_5dGroundScaleY: undefined,
    story2_5dPlayerScreenY: undefined,
    story2_5dVolumePropCount: undefined,
    story2_5dDepthSortedPropCount: undefined,
    story2_5dProjectedUnderlayEnabled: false,
  };
}

export const STORY_MECH_LABELS: Record<StoryMechId, string> = {
  vanguard: "先锋机甲",
  medic: "医疗机甲",
  engineer: "工程机甲",
};

export const useGameStore = defineStore("game", {
  state: (): GameStoreState => ({
    phase: "menu",
    mode: "classic",
    selectedStoryMechId: null,
    bossRushScenarioId: null,
    runState: createRunState(),
    message: "点击开始游戏，部署机甲进入城市废土。",
    ...createInitialMetrics(),
  }),
  getters: {
    hudLines: (state): string[] => [
      `模式 ${state.mode === "story" ? "剧情模式" : state.mode === "bossRush" ? "Boss Rush" : "经典模式"}`,
      ...(state.mode === "story"
        ? [
            `灯塔 ${state.storyLitLighthouseCount ?? 0}/1  视野 ${state.storyVisionRadius ?? 0}  怪物压力 x${state.storyMonsterPressureMultiplier ?? 1}`,
            `剧情机甲 ${state.selectedStoryMechId ? STORY_MECH_LABELS[state.selectedStoryMechId] : "未选择"}  全城开放调图中  移速 x2.5  地图 ${state.mapWidth}x${state.mapHeight}`,
          ]
        : []),
      ...createHudLines(state.runState),
      `地图 ${state.mapWidth}x${state.mapHeight}  怪物 ${state.enemyCount}  子弹 ${state.bulletCount}  楼房 ${state.buildingCount}  Boss ${state.bossCount}/${Math.max(3, state.bossCount, state.bossNames.length)}`,
      `位置 ${state.currentBuildingId ? `室内 ${state.currentBuildingId}` : "室外"}`,
      `游荡 Boss ${state.bossNames.join(" / ") || "无"}`,
      `普攻 ${state.attackMode === "auto" ? "自动" : "手动"}  Space 发射子弹  1-4 技能弹幕`,
    ],
  },
  actions: {
    startGame(): void {
      this.phase = "playing";
      this.mode = "classic";
      this.selectedStoryMechId = null;
      this.bossRushScenarioId = null;
      this.runState = createRunState();
      Object.assign(this, createInitialMetrics());
      this.message = "机甲上线。城市废土开始刷新威胁。";
    },
    openStoryIntro(): void {
      this.phase = "storyIntro";
      this.mode = "story";
      this.selectedStoryMechId = null;
      this.bossRushScenarioId = null;
      this.message = "剧情模式：任务简报载入中。";
    },
    openStoryMechSelect(): void {
      this.phase = "storyMechSelect";
      this.mode = "story";
      this.message = "选择本次进入雾城的机甲类型。";
    },
    startStoryMode(mechId?: StoryMechId): void {
      const selectedMechId = mechId ?? this.selectedStoryMechId ?? "vanguard";
      this.phase = "playing";
      this.mode = "story";
      this.selectedStoryMechId = selectedMechId;
      this.bossRushScenarioId = null;
      this.runState = createRunState();
      Object.assign(this, createInitialMetrics());
      this.selectedStoryMechId = selectedMechId;
      this.message = "剧情模式调图版：全城已开放，移速提高到 2.5 倍。";
    },
    openBossRushSelect(): void {
      this.phase = "bossRushSelect";
      this.mode = "bossRush";
      this.selectedStoryMechId = null;
      this.bossRushScenarioId = null;
      this.message = "选择 Boss Rush 副本。";
    },
    startBossRush(scenarioId: BossRushScenarioId): void {
      this.phase = "playing";
      this.mode = "bossRush";
      this.selectedStoryMechId = null;
      this.bossRushScenarioId = scenarioId;
      this.runState = createRunState();
      Object.assign(this, createInitialMetrics());
      this.message = "Boss Rush 已启动。";
    },
    finishGame(): void {
      this.phase = "gameOver";
      this.message = "机甲失联。任务失败。";
    },
    completeMission(): void {
      this.phase = "missionSuccess";
      this.message = "任务成功：失控战争核心已摧毁。";
    },
    returnToMenu(): void {
      this.phase = "menu";
      this.mode = "classic";
      this.selectedStoryMechId = null;
      this.bossRushScenarioId = null;
      this.runState = createRunState();
      Object.assign(this, createInitialMetrics());
      this.message = "点击开始游戏，部署机甲进入城市废土。";
    },
    syncRunState(runState: RunState): void {
      this.runState = runState;
    },
    syncMetrics(metrics: GameMetrics): void {
      this.enemyCount = metrics.enemyCount;
      this.bossCount = metrics.bossCount;
      this.bossHazardCount = metrics.bossHazardCount;
      this.bulletCount = metrics.bulletCount;
      this.buildingCount = metrics.buildingCount;
      this.renderedBuildingCount = metrics.renderedBuildingCount;
      this.mapWidth = metrics.mapWidth;
      this.mapHeight = metrics.mapHeight;
      this.attackMode = metrics.attackMode;
      this.bossName = metrics.bossName;
      this.bossNames = metrics.bossNames;
      this.insideBuilding = metrics.insideBuilding;
      this.currentBuildingId = metrics.currentBuildingId;
      this.playerX = metrics.playerX;
      this.playerY = metrics.playerY;
      this.playerHealth = metrics.playerHealth;
      this.storyVisionRadius = metrics.storyVisionRadius;
      this.storyLitLighthouseCount = metrics.storyLitLighthouseCount;
      this.storyMonsterPressureMultiplier = metrics.storyMonsterPressureMultiplier;
      this.storyMagicianInterferenceActive = metrics.storyMagicianInterferenceActive;
      this.storyMagicianInterferenceCount = metrics.storyMagicianInterferenceCount;
      this.selectedStoryMechId = metrics.selectedStoryMechId ?? this.selectedStoryMechId;
      this.storyArtSliceEnabled = metrics.storyArtSliceEnabled;
      this.storyLighthouseVisualState = metrics.storyLighthouseVisualState;
      this.storyArtSpriteCount = metrics.storyArtSpriteCount;
      this.story2_5dEnabled = metrics.story2_5dEnabled;
      this.story2_5dGroundScaleY = metrics.story2_5dGroundScaleY;
      this.story2_5dPlayerScreenY = metrics.story2_5dPlayerScreenY;
      this.story2_5dVolumePropCount = metrics.story2_5dVolumePropCount;
      this.story2_5dDepthSortedPropCount = metrics.story2_5dDepthSortedPropCount;
      this.story2_5dProjectedUnderlayEnabled = metrics.story2_5dProjectedUnderlayEnabled;
    },
    setMessage(message: string): void {
      this.message = message;
    },
  },
});
