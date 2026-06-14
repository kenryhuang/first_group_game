export const CLOWN_ATTACK_RANGE_MIN_BUFFER = 40;
export const CLOWN_ATTACK_RANGE_IDEAL_BUFFER = 80;
export const CLOWN_ATTACK_RANGE_MAX_BUFFER = 160;
export const CLOWN_MAGIC_BOX_FREEZE_MS = 1700;
export const CLOWN_MAGIC_BOX_TRIGGER_RADIUS = 78;
export const CLOWN_KNIFE_BURST_COUNT = 16;
export const CLOWN_SURPRISE_SLASH_COUNT = 2;
export const CLOWN_SURPRISE_SLASH_DAMAGE = 13;
export const CLOWN_SURPRISE_RETREAT_DISTANCE = 430;
export const CLOWN_SPIRAL_KNIFE_DURATION_MS = 10000;
export const CLOWN_SPIRAL_KNIFE_TICK_MS = 170;
export const CLOWN_SPIRAL_KNIFE_STEP = 0.55;

interface Point {
  x: number;
  y: number;
}

export function getClownKeepAwayBand(playerAttackRange: number): { min: number; ideal: number; max: number } {
  return {
    min: playerAttackRange + CLOWN_ATTACK_RANGE_MIN_BUFFER,
    ideal: playerAttackRange + CLOWN_ATTACK_RANGE_IDEAL_BUFFER,
    max: playerAttackRange + CLOWN_ATTACK_RANGE_MAX_BUFFER,
  };
}

export function getClownDistanceTarget(clown: Point, player: Point, playerAttackRange: number): Point {
  const dx = clown.x - player.x;
  const dy = clown.y - player.y;
  const currentDistance = Math.hypot(dx, dy) || 1;
  const band = getClownKeepAwayBand(playerAttackRange);
  if (currentDistance < band.min || currentDistance > band.max) {
    const scale = band.ideal / currentDistance;
    return {
      x: player.x + dx * scale,
      y: player.y + dy * scale,
    };
  }
  return clown;
}
