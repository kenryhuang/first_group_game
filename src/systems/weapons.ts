export interface GunTuning {
  damage: number;
  projectileSpeed: number;
  attackIntervalMs: number;
}

export const BASIC_GUN: GunTuning = {
  damage: 14,
  projectileSpeed: 1350,
  attackIntervalMs: 380,
};
