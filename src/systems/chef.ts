export const CHEF_CHILI_OIL_BOTTLE_COUNT = 6;
export const CHEF_CHILI_OIL_BOTTLE_FLIGHT_MS = 520;
export const CHEF_CHILI_OIL_SPREAD_RADIUS = 360;
export const CHEF_WOK_BLOCK_HALF_ANGLE = Math.PI / 2.4;
export const CHEF_WOK_MODEL_RADIUS = 30;
export const CHEF_CRASH_AIRBORNE_OFFSET_Y = -760;
export const CHEF_MEAT_GRINDER_HEALTH_RATIO = 0.35;
export const CHEF_MEAT_GRINDER_ARM_COUNT = 3;
export const CHEF_MEAT_GRINDER_DURATION_MS = 9000;
export const CHEF_MEAT_GRINDER_ARM_LENGTH = 220;
export const CHEF_MEAT_GRINDER_DAMAGE = 10;
export const CHEF_MEAT_GRINDER_TICK_MS = 280;

export function shouldTriggerChefMeatGrinder({
  health,
  maxHealth,
  used,
}: {
  health: number;
  maxHealth: number;
  used: boolean;
}): boolean {
  return !used && health / maxHealth <= CHEF_MEAT_GRINDER_HEALTH_RATIO;
}

export function shouldChefBlockBasicAttack({
  chefRotation,
  incomingAngle,
  isBasicAttack,
  isBusy,
}: {
  chefRotation: number;
  incomingAngle: number;
  isBasicAttack: boolean;
  isBusy: boolean;
}): boolean {
  if (!isBasicAttack || isBusy) return false;
  return Math.abs(normalizeAngle(incomingAngle - chefRotation)) <= CHEF_WOK_BLOCK_HALF_ANGLE;
}

function normalizeAngle(angle: number): number {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}
