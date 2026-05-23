export type AutoWeaponId = "missile-pod" | "orbital-flak" | "micro-missiles";
export type AutoWeaponMode = "area" | "precise" | "swarm";
export type AutoWeaponPriority = "cluster" | "boss" | "nearest";

export interface AutoWeaponDefinition {
  id: AutoWeaponId;
  name: string;
  mode: AutoWeaponMode;
  priority: AutoWeaponPriority;
  cooldownMs: number;
  baseDamage: number;
  radius: number;
  range: number;
  projectileSpeed: number;
  burstCount: number;
}

export const AUTO_WEAPON_DEFINITIONS: AutoWeaponDefinition[] = [
  {
    id: "missile-pod",
    name: "肩载导弹巢",
    mode: "area",
    priority: "cluster",
    cooldownMs: 2600,
    baseDamage: 18,
    radius: 96,
    range: 920,
    projectileSpeed: 520,
    burstCount: 1,
  },
  {
    id: "orbital-flak",
    name: "轨道高射炮",
    mode: "precise",
    priority: "boss",
    cooldownMs: 4200,
    baseDamage: 58,
    radius: 44,
    range: 1100,
    projectileSpeed: 0,
    burstCount: 1,
  },
  {
    id: "micro-missiles",
    name: "蜂群微型导弹",
    mode: "swarm",
    priority: "nearest",
    cooldownMs: 3300,
    baseDamage: 11,
    radius: 42,
    range: 820,
    projectileSpeed: 760,
    burstCount: 5,
  },
];

export function getActiveAutoWeapons(ranks: Record<string, number>): AutoWeaponDefinition[] {
  return AUTO_WEAPON_DEFINITIONS.filter((weapon) => (ranks[weapon.id] ?? 0) > 0);
}

export function isAutoWeaponReady(weapon: AutoWeaponDefinition, elapsedMs: number): boolean {
  return elapsedMs >= weapon.cooldownMs;
}

export function getAutoWeaponDamage(weapon: AutoWeaponDefinition, rank: number): number {
  return Math.round(weapon.baseDamage * (1 + Math.max(0, rank - 1) * 0.22));
}
