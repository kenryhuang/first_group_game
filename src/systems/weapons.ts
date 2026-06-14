export interface GunTuning {
  damage: number;
  projectileSpeed: number;
  attackIntervalMs: number;
  sparkCount: number;
  recoilDistance: number;
  screenShakeMagnitude: number;
}

export interface BasicGunFireFeedback {
  actorRecoilDistance: number;
  screenShakeMagnitude: number;
}

export const BASIC_GUN: GunTuning = {
  damage: 2,
  projectileSpeed: 1650,
  attackIntervalMs: 75,
  sparkCount: 7,
  recoilDistance: 16,
  screenShakeMagnitude: 4,
};

export function getBasicGunFireFeedback({
  storyMode,
}: {
  storyMode: boolean;
}): BasicGunFireFeedback {
  if (storyMode) {
    return {
      actorRecoilDistance: 0,
      screenShakeMagnitude: 0,
    };
  }

  return {
    actorRecoilDistance: 3.5,
    screenShakeMagnitude: BASIC_GUN.screenShakeMagnitude,
  };
}
