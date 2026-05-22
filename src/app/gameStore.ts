import { defineStore } from "pinia";
import type { RunState } from "../domain/types";
import { createRunState } from "../systems/runState";
import { MAP_HEIGHT, MAP_WIDTH } from "../systems/spawning";
import { BUILDINGS } from "../systems/terrain";
import { createHudLines } from "../ui/hud";

export type GamePhase = "menu" | "playing" | "gameOver";

export interface GameMetrics {
  enemyCount: number;
  bossCount: number;
  bulletCount: number;
  buildingCount: number;
  mapWidth: number;
  mapHeight: number;
  attackMode: "auto" | "manual";
  bossName: string | null;
  bossNames: string[];
  insideBuilding: boolean;
  currentBuildingId: string | null;
  playerHealth: number;
}

interface GameStoreState extends GameMetrics {
  phase: GamePhase;
  runState: RunState;
  message: string;
}

function createInitialMetrics(): GameMetrics {
  return {
    enemyCount: 0,
    bossCount: 0,
    bulletCount: 0,
    buildingCount: BUILDINGS.length,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    attackMode: "auto",
    bossName: null,
    bossNames: [],
    insideBuilding: false,
    currentBuildingId: null,
    playerHealth: createRunState().health,
  };
}

export const useGameStore = defineStore("game", {
  state: (): GameStoreState => ({
    phase: "menu",
    runState: createRunState(),
    message: "点击开始游戏，部署机甲进入城市废土。",
    ...createInitialMetrics(),
  }),
  getters: {
    hudLines: (state): string[] => [
      ...createHudLines(state.runState),
      `地图 ${state.mapWidth}x${state.mapHeight}  怪物 ${state.enemyCount}  子弹 ${state.bulletCount}  楼房 ${state.buildingCount}  Boss ${state.bossCount}/3`,
      `位置 ${state.currentBuildingId ? `室内 ${state.currentBuildingId}` : "室外"}`,
      `游荡 Boss ${state.bossNames.join(" / ") || "无"}`,
      `普攻 ${state.attackMode === "auto" ? "自动" : "手动"}  Space 发射子弹  1-4 技能弹幕`,
    ],
  },
  actions: {
    startGame(): void {
      this.phase = "playing";
      this.runState = createRunState();
      Object.assign(this, createInitialMetrics());
      this.message = "机甲上线。城市废土开始刷新威胁。";
    },
    finishGame(): void {
      this.phase = "gameOver";
      this.message = "机甲失联。任务失败。";
    },
    returnToMenu(): void {
      this.phase = "menu";
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
      this.bulletCount = metrics.bulletCount;
      this.buildingCount = metrics.buildingCount;
      this.mapWidth = metrics.mapWidth;
      this.mapHeight = metrics.mapHeight;
      this.attackMode = metrics.attackMode;
      this.bossName = metrics.bossName;
      this.bossNames = metrics.bossNames;
      this.insideBuilding = metrics.insideBuilding;
      this.currentBuildingId = metrics.currentBuildingId;
      this.playerHealth = metrics.playerHealth;
    },
    setMessage(message: string): void {
      this.message = message;
    },
  },
});
