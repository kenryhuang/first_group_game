import type { BossId } from "../domain/types";

export interface Point {
  x: number;
  y: number;
}

export interface BossTerritory {
  center: Point;
  radius: number;
}

export const BOSS_TERRITORIES: Record<BossId, BossTerritory> = {
  chef: { center: { x: 2300, y: 2200 }, radius: 1350 },
  clown: { center: { x: 7600, y: 2050 }, radius: 1350 },
  courier: { center: { x: 7600, y: 7600 }, radius: 1500 },
};

export function isPointInBossTerritory(bossId: BossId, point: Point, margin = 0): boolean {
  const territory = BOSS_TERRITORIES[bossId];
  return Math.hypot(point.x - territory.center.x, point.y - territory.center.y) <= territory.radius + margin;
}

export function getBossTerritorySpawnPosition(bossId: BossId): Point {
  const territory = BOSS_TERRITORIES[bossId];
  return {
    x: territory.center.x + territory.radius * 0.28,
    y: territory.center.y,
  };
}

export function getBossRoamTargetInTerritory(bossId: BossId, seed: number): Point {
  const territory = BOSS_TERRITORIES[bossId];
  const angle = seed * 1.17 + (bossId === "chef" ? 0.2 : bossId === "clown" ? 2.1 : 4.0);
  const radius = territory.radius * (0.38 + (seed % 4) * 0.1);

  return {
    x: territory.center.x + Math.cos(angle) * radius,
    y: territory.center.y + Math.sin(angle) * radius,
  };
}
