export const PLAYER_WEAPON_VISUAL_GEOMETRY = {
  barrel: {
    x: 2,
    y: -4.5,
    width: 30,
    height: 9,
    radius: 2.5,
  },
  energyCore: {
    x: 8,
    y: -1.3,
    width: 15,
    height: 2.6,
  },
  sideVents: {
    x: 22,
    upperY: -6.5,
    lowerY: 3,
    width: 8,
    height: 3.4,
  },
  muzzleTips: {
    x: 31,
    upperY: -2.6,
    lowerY: 0.8,
    width: 8.5,
    height: 2.2,
  },
  muzzleFlash: {
    baseX: 35,
    tipX: 50,
    upperY: -6.5,
    lowerY: 6.5,
    innerX: 44,
    circleX: 39,
    circleRadius: 4.2,
  },
} as const;

export const PLAYER_WEAPON_MUZZLE_DISTANCE =
  PLAYER_WEAPON_VISUAL_GEOMETRY.muzzleFlash.tipX;

export const PLAYER_WEAPON_BACK_DEPTH_OFFSET = 10;
export const PLAYER_WEAPON_FRONT_DEPTH_OFFSET = 30;

export interface StoryPlayerWeaponPose {
  rotation: number;
  offsetX: number;
  offsetY: number;
  barrelScaleY: number;
  depthOffset: number;
}

const STORY_PLAYER_WEAPON_PITCH_SCALE = 0.38;

export function getPlayerWeaponDepthOffset(angle: number): number {
  return Math.sin(angle) < -0.25
    ? PLAYER_WEAPON_BACK_DEPTH_OFFSET
    : PLAYER_WEAPON_FRONT_DEPTH_OFFSET;
}

export function getStoryPlayerWeaponPose(angle: number): StoryPlayerWeaponPose {
  const depthOffset = getPlayerWeaponDepthOffset(angle);
  const side = Math.cos(angle) >= 0 ? 1 : -1;
  const rotation = Math.atan2(
    Math.sin(angle) * STORY_PLAYER_WEAPON_PITCH_SCALE,
    Math.cos(angle),
  );

  if (depthOffset === PLAYER_WEAPON_BACK_DEPTH_OFFSET) {
    return {
      rotation,
      offsetX: side * 4,
      offsetY: -28,
      barrelScaleY: 0.62,
      depthOffset,
    };
  }

  if (Math.sin(angle) > 0.25) {
    return {
      rotation,
      offsetX: side * -3,
      offsetY: -13,
      barrelScaleY: 0.66,
      depthOffset,
    };
  }

  return {
    rotation,
    offsetX: side * 2,
    offsetY: -18,
    barrelScaleY: 0.9,
    depthOffset,
  };
}
