import type { BossId } from "../domain/types";

export const MAP_WIDTH = 10000;
export const MAP_HEIGHT = 10000;
export const PLAYER_START = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
export const ENEMY_SPAWN_TICK_MS = 1000;

const ENEMY_MIN_SPAWN_DISTANCE = 380;
const ENEMY_MAX_SPAWN_DISTANCE = 620;
const BASE_ENEMY_SPAWN_BATCH = 10;
const MIN_ENEMY_MAX_ALIVE = 80;
const MAX_ENEMY_MAX_ALIVE = 260;
const SPAWN_PRESSURE_LEVEL_CAP = 60;

export interface Point {
  x: number;
  y: number;
}

export function getSpawnPositionAroundPlayer(player: Point, seed: number): Point {
  const angle = seed * 2.399963229728653;
  const ring = seed % 2 === 0 ? ENEMY_MIN_SPAWN_DISTANCE : ENEMY_MAX_SPAWN_DISTANCE;

  return clampToMap({
    x: player.x + Math.cos(angle) * ring,
    y: player.y + Math.sin(angle) * ring,
  });
}

export function getBossSpawnPosition(player: Point, bossId: BossId): Point {
  const offsets: Record<BossId, Point> = {
    chef: { x: 820, y: -520 },
    clown: { x: -940, y: -760 },
    courier: { x: 520, y: 960 },
  };
  const offset = offsets[bossId];
  return clampToMap({
    x: player.x + offset.x,
    y: player.y + offset.y,
  });
}

export function getNodeWorldPosition(node: Point): Point {
  return {
    x: clamp(node.x * 2.2 + 900, 120, MAP_WIDTH - 120),
    y: clamp(node.y * 2.8 + 1100, 120, MAP_HEIGHT - 120),
  };
}

export function getEnemySpawnRatePerSecond(level: number): number {
  return BASE_ENEMY_SPAWN_BATCH + Math.max(0, Math.floor(level) - 1);
}

export function getEnemySpawnBatchSize(level: number, elapsedMs: number): number {
  return Math.max(1, Math.round((getEnemySpawnRatePerSecond(level) * elapsedMs) / 1000));
}

export function getEnemyMaxAlive(level: number): number {
  const progress = getLevelProgress(level);
  return Math.round(MIN_ENEMY_MAX_ALIVE + (MAX_ENEMY_MAX_ALIVE - MIN_ENEMY_MAX_ALIVE) * progress);
}

function clampToMap(point: Point): Point {
  return {
    x: clamp(point.x, 24, MAP_WIDTH - 24),
    y: clamp(point.y, 24, MAP_HEIGHT - 24),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getLevelProgress(level: number): number {
  return clamp((level - 1) / (SPAWN_PRESSURE_LEVEL_CAP - 1), 0, 1);
}
