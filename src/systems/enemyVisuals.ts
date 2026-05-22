import type { BossId } from "../domain/types";

export interface EnemyVisualTheme {
  kind: string;
  bodyColor: number;
  headColor: number;
  bloodColor: number;
  accentColor: number;
}

export interface BossVisualTheme {
  bodyColor: number;
  armorColor: number;
  accentColor: number;
  weaponColor: number;
}

export const ZOMBIE_ENEMY_THEME: EnemyVisualTheme = {
  kind: "top-down-zombie",
  bodyColor: 0x6f8a63,
  headColor: 0x91a875,
  bloodColor: 0xb4232a,
  accentColor: 0xc7d3a1,
};

export const BOSS_VISUAL_THEMES: Record<BossId, BossVisualTheme> = {
  chef: {
    bodyColor: 0x8f2f2f,
    armorColor: 0x4a1717,
    accentColor: 0xe63946,
    weaponColor: 0xe8d7b9,
  },
  clown: {
    bodyColor: 0x5f3a82,
    armorColor: 0x2d173d,
    accentColor: 0x9d4edd,
    weaponColor: 0xffd166,
  },
  courier: {
    bodyColor: 0x7a4b1e,
    armorColor: 0x2b2520,
    accentColor: 0xf77f00,
    weaponColor: 0xffba08,
  },
};
