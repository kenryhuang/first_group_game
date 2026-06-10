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
  beastmaster: {
    bodyColor: 0x3d5a35,
    armorColor: 0x1f2f1b,
    accentColor: 0xa7c957,
    weaponColor: 0xe9c46a,
  },
  "plague-doctor": {
    bodyColor: 0x244b4f,
    armorColor: 0x12272a,
    accentColor: 0x2ec4b6,
    weaponColor: 0x7bd88f,
  },
  "tesla-engineer": {
    bodyColor: 0x263859,
    armorColor: 0x141c2e,
    accentColor: 0x68e1fd,
    weaponColor: 0xf7d774,
  },
  magician: {
    bodyColor: 0x2d174d,
    armorColor: 0x13091f,
    accentColor: 0xff4d9d,
    weaponColor: 0xfff3b0,
  },
  "war-convoy": {
    bodyColor: 0x4a4f57,
    armorColor: 0x1b1f24,
    accentColor: 0xff6b35,
    weaponColor: 0xc8d5d9,
  },
};
