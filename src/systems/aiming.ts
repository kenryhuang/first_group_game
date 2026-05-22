export interface Point {
  x: number;
  y: number;
}

export function getAimTarget(
  player: Point,
  combatTarget?: Point,
  pointerTarget?: Point,
  movementDirection?: Point,
): Point {
  if (combatTarget) return combatTarget;
  if (movementDirection && (movementDirection.x !== 0 || movementDirection.y !== 0)) {
    return {
      x: player.x + movementDirection.x * 100,
      y: player.y + movementDirection.y * 100,
    };
  }
  return pointerTarget ?? { x: player.x + 1, y: player.y };
}
