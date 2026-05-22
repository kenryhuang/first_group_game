export interface GunTuning {
  damage: number;
  projectileSpeed: number;
  attackIntervalMs: number;
}

export const BASIC_GUN: GunTuning = {
  damage: 2,
  projectileSpeed: 1650,
  attackIntervalMs: 75,
};
