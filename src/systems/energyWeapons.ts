export type EnergySkillId =
  | "focus-laser"
  | "orbital-laser-rain"
  | "phase-blink"
  | "temporal-rewind"
  | "warp-mines"
  | "prism-amplifier";

export type EnergySkillMode = "beam" | "rain" | "blink" | "rewind" | "mine" | "passive";
export type MechEvolutionStage = "base" | "heavy" | "laser" | "temporal";

export interface EnergySkillDefinition {
  id: EnergySkillId;
  name: string;
  mode: EnergySkillMode;
  cooldownMs: number;
  basePower: number;
  range: number;
  radius: number;
  burstCount: number;
}

export const ENERGY_SKILL_DEFINITIONS: EnergySkillDefinition[] = [
  {
    id: "focus-laser",
    name: "聚能激光",
    mode: "beam",
    cooldownMs: 1900,
    basePower: 16,
    range: 900,
    radius: 22,
    burstCount: 1,
  },
  {
    id: "orbital-laser-rain",
    name: "轨道激光雨",
    mode: "rain",
    cooldownMs: 5200,
    basePower: 20,
    range: 760,
    radius: 38,
    burstCount: 5,
  },
  {
    id: "phase-blink",
    name: "相位闪现",
    mode: "blink",
    cooldownMs: 6200,
    basePower: 18,
    range: 270,
    radius: 86,
    burstCount: 1,
  },
  {
    id: "temporal-rewind",
    name: "时间回溯",
    mode: "rewind",
    cooldownMs: 15000,
    basePower: 28,
    range: 3000,
    radius: 120,
    burstCount: 1,
  },
  {
    id: "warp-mines",
    name: "折跃地雷",
    mode: "mine",
    cooldownMs: 2400,
    basePower: 20,
    range: 120,
    radius: 64,
    burstCount: 1,
  },
  {
    id: "prism-amplifier",
    name: "棱镜增幅器",
    mode: "passive",
    cooldownMs: 0,
    basePower: 0,
    range: 420,
    radius: 0,
    burstCount: 1,
  },
];

export function getActiveEnergySkills(ranks: Record<string, number>): EnergySkillDefinition[] {
  return ENERGY_SKILL_DEFINITIONS.filter((skill) => (ranks[skill.id] ?? 0) > 0);
}

export function isEnergySkillReady(skill: EnergySkillDefinition, elapsedMs: number): boolean {
  return skill.cooldownMs > 0 && elapsedMs >= skill.cooldownMs;
}

export function getEnergySkillPower(skill: EnergySkillDefinition, rank: number): number {
  return Math.round(skill.basePower * (1 + Math.max(0, rank - 1) * 0.24));
}

export function getMechEvolutionStage(ranks: Record<string, number>): MechEvolutionStage {
  if ((ranks["phase-blink"] ?? 0) > 0 || (ranks["temporal-rewind"] ?? 0) > 0) {
    return "temporal";
  }
  if (
    (ranks["focus-laser"] ?? 0) > 0 ||
    (ranks["orbital-laser-rain"] ?? 0) > 0 ||
    (ranks["prism-amplifier"] ?? 0) > 0
  ) {
    return "laser";
  }
  if (
    (ranks["missile-pod"] ?? 0) > 0 ||
    (ranks["orbital-flak"] ?? 0) > 0 ||
    (ranks["micro-missiles"] ?? 0) > 0
  ) {
    return "heavy";
  }
  return "base";
}
