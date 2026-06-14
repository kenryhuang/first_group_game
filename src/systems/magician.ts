export type MagicianCurtainKind = "solid" | "illusion";
export type MagicianCurtainTell = "gold-edge" | "soft-edge";
export type MagicianSpotlightPreRevealTell = "same-stage-light";
export type MagicianSpotlightFinalTell = "steady-core" | "faint-purple-flicker";
export type MagicianCurtainCallKind = "standard" | "revealed" | "finale" | "finale-revealed";

export interface MagicianCurtainRule {
  lane: number;
  kind: MagicianCurtainKind;
  tell: MagicianCurtainTell;
}

export interface MagicianSpotlightRule {
  index: number;
  safe: boolean;
  preRevealTell: MagicianSpotlightPreRevealTell;
  finalTell: MagicianSpotlightFinalTell;
}

export interface MagicianHatRule {
  index: number;
  real: boolean;
  reward?: "extended-curtain-call";
  punishment?: "minor-blast";
}

export interface MagicianMirrorBodyRule {
  index: number;
  real: boolean;
  tell: "shadow-ring" | "flat-light";
  revealReward?: "boss-teleport";
  breaksInto?: "radial-shards";
  orbitDirection: 1 | -1;
  orbitOffset: number;
}

export const MAGICIAN_CURTAIN_LANE_COUNT = 9;
export const MAGICIAN_SPOTLIGHT_COUNT = 7;
export const MAGICIAN_SPOTLIGHT_ORBIT_ROUNDS = 2;
export const MAGICIAN_SPOTLIGHT_CHOOSE_MS = 8000;
export const MAGICIAN_SPOTLIGHT_STAGE_RADIUS = 240;
export const MAGICIAN_SPOTLIGHT_FALSE_BLAST_RADIUS = 210;
export const MAGICIAN_MIRROR_ORBIT_SPEED = 1.35;
export const MAGICIAN_MIRROR_SHARD_COUNT = 16;
export const MAGICIAN_MIRROR_SHARD_SPEED = 620;
export const STORY_MAGICIAN_INTERFERENCE_COOLDOWN_MS = 1800;
export const STORY_MAGICIAN_INTERFERENCE_CURTAIN_COUNT = 0;
export const STORY_MAGICIAN_REMOTE_MIRROR_COUNT = 2;
export const STORY_MAGICIAN_REMOTE_MIRROR_BREAKS_INTO = "radial-shards";
export const STORY_MAGICIAN_REMOTE_MIRROR_ATTACK_COOLDOWN_MS = 950;
export const STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_SPEED = 560;
export const STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_DAMAGE = 7;
export const STORY_MAGICIAN_REMOTE_MIRROR_PROXIMITY_BURST_RADIUS = 110;
export const MAGICIAN_STANDARD_CURTAIN_CALL_MS = 2500;
export const MAGICIAN_REVEALED_CURTAIN_CALL_MS = 4500;
export const MAGICIAN_FINALE_CURTAIN_CALL_MS = 6000;
export const MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS = 8000;

export function createMagicianCurtains(seed = 0): MagicianCurtainRule[] {
  const half = Math.floor(MAGICIAN_CURTAIN_LANE_COUNT / 2);
  return Array.from({ length: MAGICIAN_CURTAIN_LANE_COUNT }, (_, index) => {
    const lane = index - half;
    const solid = (index + seed) % 2 === 0 || lane === 0;
    return {
      lane,
      kind: solid ? "solid" : "illusion",
      tell: solid ? "gold-edge" : "soft-edge",
    };
  });
}

export function createMagicianSpotlights(seed = 0): MagicianSpotlightRule[] {
  const safeIndex = Math.abs(seed) % MAGICIAN_SPOTLIGHT_COUNT;
  return Array.from({ length: MAGICIAN_SPOTLIGHT_COUNT }, (_, index) => ({
    index,
    safe: index === safeIndex,
    preRevealTell: "same-stage-light",
    finalTell: index === safeIndex ? "steady-core" : "faint-purple-flicker",
  }));
}

export function createMagicianHatMaze(seed = 0): MagicianHatRule[] {
  const realIndex = Math.abs(seed * 3 + 1) % 5;
  return Array.from({ length: 5 }, (_, index) =>
    index === realIndex
      ? { index, real: true, reward: "extended-curtain-call" }
      : { index, real: false, punishment: "minor-blast" },
  );
}

export function createMagicianMirrorHall(seed = 0): MagicianMirrorBodyRule[] {
  const realIndex = Math.abs(seed * 5 + 2) % 5;
  return Array.from({ length: 5 }, (_, index) => {
    const movement = {
      orbitDirection: ((index + seed) % 2 === 0 ? 1 : -1) as 1 | -1,
      orbitOffset: (Math.PI * 2 * index) / 5 + seed * 0.13,
    };
    return index === realIndex
      ? { index, real: true, tell: "shadow-ring", revealReward: "boss-teleport", ...movement }
      : { index, real: false, tell: "flat-light", breaksInto: "radial-shards", ...movement };
  });
}

export function getMagicianCurtainCallMs(kind: MagicianCurtainCallKind): number {
  if (kind === "revealed") return MAGICIAN_REVEALED_CURTAIN_CALL_MS;
  if (kind === "finale") return MAGICIAN_FINALE_CURTAIN_CALL_MS;
  if (kind === "finale-revealed") return MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS;
  return MAGICIAN_STANDARD_CURTAIN_CALL_MS;
}
