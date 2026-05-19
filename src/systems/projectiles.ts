export type ProjectileKind = "basic" | "skill";

export interface Point {
  x: number;
  y: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface ProjectileState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  kind: ProjectileKind;
  damage: number;
  radius: number;
  lifeMs: number;
  expired: boolean;
}

export function createProjectileState(
  origin: Point,
  target: Point,
  kind: ProjectileKind,
  speed: number,
  damage: number,
): ProjectileState {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: origin.x,
    y: origin.y,
    velocityX: Math.round((dx / length) * speed * 1000) / 1000,
    velocityY: Math.round((dy / length) * speed * 1000) / 1000,
    kind,
    damage,
    radius: kind === "basic" ? 5 : 8,
    lifeMs: kind === "basic" ? 1200 : 1500,
    expired: false,
  };
}

export function updateProjectileState(projectile: ProjectileState, deltaMs: number): ProjectileState {
  const seconds = deltaMs / 1000;
  const lifeMs = projectile.lifeMs - deltaMs;

  return {
    ...projectile,
    x: Math.round((projectile.x + projectile.velocityX * seconds) * 1000) / 1000,
    y: Math.round((projectile.y + projectile.velocityY * seconds) * 1000) / 1000,
    lifeMs,
    expired: lifeMs <= 0,
  };
}

export function projectileHitsCircle(projectile: ProjectileState, target: Circle): boolean {
  const distance = Math.hypot(projectile.x - target.x, projectile.y - target.y);
  return distance <= projectile.radius + target.radius;
}
