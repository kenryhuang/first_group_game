export const PLAYER_WEAPON_VISUAL_GEOMETRY = {
  barrel: {
    x: 4,
    y: -5,
    width: 34,
    height: 10,
    radius: 3,
  },
  energyCore: {
    x: 10,
    y: -1.5,
    width: 17,
    height: 3,
  },
  sideVents: {
    x: 24,
    upperY: -7.5,
    lowerY: 3.5,
    width: 10,
    height: 4,
  },
  muzzleTips: {
    x: 35,
    upperY: -3,
    lowerY: 1,
    width: 10,
    height: 2.5,
  },
  muzzleFlash: {
    baseX: 40,
    tipX: 56,
    upperY: -8,
    lowerY: 8,
    innerX: 50,
    circleX: 44,
    circleRadius: 5,
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

const STORY_PLAYER_WEAPON_PITCH_SCALE = 0.55;

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
      offsetY: -30,
      barrelScaleY: 0.72,
      depthOffset,
    };
  }

  if (Math.sin(angle) > 0.25) {
    return {
      rotation,
      offsetX: side * -3,
      offsetY: -14,
      barrelScaleY: 0.76,
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
