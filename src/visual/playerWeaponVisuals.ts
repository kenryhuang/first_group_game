export const PLAYER_WEAPON_MUZZLE_FLASH_GEOMETRY = {
  baseX: 35,
  tipX: 50,
  upperY: -6.5,
  lowerY: 6.5,
  innerX: 44,
  circleX: 39,
  circleRadius: 4.2,
} as const;

export const PLAYER_WEAPON_MUZZLE_DISTANCE =
  PLAYER_WEAPON_MUZZLE_FLASH_GEOMETRY.tipX;

export const PLAYER_WEAPON_BACK_DEPTH_OFFSET = 10;
export const PLAYER_WEAPON_FRONT_DEPTH_OFFSET = 30;

export interface StoryPlayerWeaponPose {
  rotation: number;
  offsetX: number;
  offsetY: number;
  barrelScaleY: number;
  depthOffset: number;
}

export function getPlayerWeaponDepthOffset(angle: number): number {
  return Math.sin(angle) < -0.25
    ? PLAYER_WEAPON_BACK_DEPTH_OFFSET
    : PLAYER_WEAPON_FRONT_DEPTH_OFFSET;
}

export function getStoryPlayerWeaponPose(angle: number): StoryPlayerWeaponPose {
  const depthOffset = getPlayerWeaponDepthOffset(angle);
  const side = Math.cos(angle) >= 0 ? 1 : -1;

  if (depthOffset === PLAYER_WEAPON_BACK_DEPTH_OFFSET) {
    return {
      rotation: angle,
      offsetX: side * 4,
      offsetY: -6,
      barrelScaleY: 0.5,
      depthOffset,
    };
  }

  if (Math.sin(angle) > 0.25) {
    return {
      rotation: angle,
      offsetX: side * -3,
      offsetY: -13,
      barrelScaleY: 0.66,
      depthOffset,
    };
  }

  return {
    rotation: angle,
    offsetX: side * 2,
    offsetY: -18,
    barrelScaleY: 0.9,
    depthOffset,
  };
}

export function getStoryPlayerWeaponHoldPose(facingVector: {
  x: number;
  y: number;
}): StoryPlayerWeaponPose {
  if (facingVector.y < -0.25) {
    return {
      rotation: -Math.PI / 2,
      offsetX: 0,
      offsetY: -6,
      barrelScaleY: 0.5,
      depthOffset: PLAYER_WEAPON_BACK_DEPTH_OFFSET,
    };
  }

  const side = facingVector.x < -0.25 ? -1 : 1;

  return {
    rotation: side < 0 ? Math.PI : 0,
    offsetX: side * -14,
    offsetY: -17,
    barrelScaleY: 0.72,
    depthOffset: PLAYER_WEAPON_FRONT_DEPTH_OFFSET,
  };
}

export function getPlayerWeaponVisualAimAngle(
  anchor: { x: number; y: number },
  target: { x: number; y: number },
): number {
  return Math.atan2(target.y - anchor.y, target.x - anchor.x);
}
