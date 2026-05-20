import { defineStore } from "pinia";
import type { RunState } from "../domain/types";
import { createRunState } from "../systems/runState";
import { MAP_HEIGHT, MAP_WIDTH } from "../systems/spawning";
import { BUILDINGS } from "../systems/terrain";
import { createHudLines } from "../ui/hud";

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
}

interface GameStoreState extends GameMetrics {
  runState: RunState;
  message: string;
}

export const useGameStore = defineStore("game", {
  state: (): GameStoreState => ({
    runState: createRunState(),
    message: "城市废土已展开。怪物会持续刷新，子弹会被楼房挡住。",
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
  }),
  getters: {
    hudLines: (state): string[] => [
      ...createHudLines(state.runState),
      `地图 ${state.mapWidth}x${state.mapHeight}  怪物 ${state.enemyCount}  子弹 ${state.bulletCount}  楼房 ${state.buildingCount}  Boss ${state.bossCount}/3`,
      `位置 ${state.insideBuilding ? "室内" : "室外"}`,
      `游荡 Boss ${state.bossNames.join(" / ") || "无"}`,
      `普攻 ${state.attackMode === "auto" ? "自动" : "手动"}  Space 发射子弹  1-4 技能弹幕`,
    ],
  },
  actions: {
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
    },
    setMessage(message: string): void {
      this.message = message;
    },
  },
});
