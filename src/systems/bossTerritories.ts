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
  beastmaster: { center: { x: 2300, y: 7600 }, radius: 1450 },
  "plague-doctor": { center: { x: 5000, y: 2500 }, radius: 1300 },
  "tesla-engineer": { center: { x: 5000, y: 7600 }, radius: 1400 },
  magician: { center: { x: 8200, y: 5000 }, radius: 1320 },
  "war-convoy": { center: { x: 1900, y: 5000 }, radius: 1600 },
};

export function isPointInBossTerritory(bossId: BossId, point: Point, margin = 0): boolean {
  const territory = BOSS_TERRITORIES[bossId];
  return Math.hypot(point.x - territory.center.x, point.y - territory.center.y) <= territory.radius + margin;
}

export function shouldRoamingBossTargetPlayer({
  finalBossActive,
  bossRushActive = false,
  sameZoneAsPlayer,
  playerInTerritory,
  distanceToPlayer,
  aggroRange = 900,
}: {
  finalBossActive: boolean;
  bossRushActive?: boolean;
  sameZoneAsPlayer: boolean;
  playerInTerritory: boolean;
  distanceToPlayer: number;
  aggroRange?: number;
}): boolean {
  return finalBossActive || bossRushActive || (sameZoneAsPlayer && playerInTerritory && distanceToPlayer < aggroRange);
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
  const angleOffsets: Record<BossId, number> = {
    chef: 0.2,
    clown: 2.1,
    courier: 4.0,
    beastmaster: 1.3,
    "plague-doctor": 2.8,
    "tesla-engineer": 3.4,
    magician: 5.2,
    "war-convoy": 0.9,
  };
  const angle = seed * 1.17 + angleOffsets[bossId];
  const radius = territory.radius * (0.38 + (seed % 4) * 0.1);

  return {
    x: territory.center.x + Math.cos(angle) * radius,
    y: territory.center.y + Math.sin(angle) * radius,
  };
}
