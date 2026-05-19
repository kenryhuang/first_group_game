import type { BossId } from "../domain/types";

export const MAP_WIDTH = 4096;
export const MAP_HEIGHT = 4096;
export const PLAYER_START = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };

const ENEMY_MIN_SPAWN_DISTANCE = 380;
const ENEMY_MAX_SPAWN_DISTANCE = 620;

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
    chef: { x: 260, y: -90 },
    clown: { x: -230, y: -180 },
    courier: { x: 110, y: 250 },
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

function clampToMap(point: Point): Point {
  return {
    x: clamp(point.x, 24, MAP_WIDTH - 24),
    y: clamp(point.y, 24, MAP_HEIGHT - 24),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
