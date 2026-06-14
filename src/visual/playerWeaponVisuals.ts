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
