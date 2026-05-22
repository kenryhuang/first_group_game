export interface GunTuning {
  damage: number;
  projectileSpeed: number;
  attackIntervalMs: number;
  sparkCount: number;
  recoilDistance: number;
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
