export type HospitalKnightPhase = 1 | 2;
export type HospitalKnightSkillId =
  | "bone-command"
  | "giant-sword-judgment"
  | "holy-lance-charge"
  | "royal-guard"
  | "dead-formation";

export const HOSPITAL_KNIGHT_SPAWN = { x: 1060, y: 3260 };
export const HOSPITAL_KNIGHT_GUARD_RADIUS = 240;
export const HOSPITAL_KNIGHT_AGGRO_RADIUS = 180;
export const INITIAL_BONE_HORDE_COUNT = 20;
export const HOLY_SHROUD_MAX_CASTS = 3;
export const GIANT_SWORD_TRAP_MS = 3000;
export const BONE_CONTACT_DAMAGE = 10;
export const BONE_SOLDIER_CONTACT_DAMAGE = 19;
export const HOSPITAL_KNIGHT_BONE_COMMAND_COUNT = 12;
export const HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT = 8;
export const HOSPITAL_KNIGHT_DEAD_FORMATION_LANES = 4;
export const HOSPITAL_KNIGHT_HOLY_LANCE_SPIKES = 6;
export const HOSPITAL_KNIGHT_BONE_COMMAND_DASH_SPEED = 620;
export const HOSPITAL_KNIGHT_HOLY_LANCE_SPIKE_DAMAGE = 12;
const RUINED_HOSPITAL = { x: 1060, y: 3260, width: 520, height: 360 };

const PHASE_ONE_SKILLS: HospitalKnightSkillId[] = ["bone-command", "giant-sword-judgment", "holy-lance-charge"];
const PHASE_TWO_SKILLS: HospitalKnightSkillId[] = ["royal-guard", "giant-sword-judgment", "holy-lance-charge", "dead-formation"];

export const HOSPITAL_KNIGHT_DEFINITION = {
  id: "hospital-knight",
  name: "白骨骑士",
  maxHealth: 2000,
  phaseTwoHealth: 1000,
};

export function getInitialBoneHordeCount(): number {
  return INITIAL_BONE_HORDE_COUNT;
}

export function getHospitalKnightPhase(health: number): HospitalKnightPhase {
  return health <= HOSPITAL_KNIGHT_DEFINITION.phaseTwoHealth ? 2 : 1;
}

export function isHospitalKnightAtRuinedHospital(point: { x: number; y: number }): boolean {
  return (
    point.x >= RUINED_HOSPITAL.x - RUINED_HOSPITAL.width / 2 &&
    point.x <= RUINED_HOSPITAL.x + RUINED_HOSPITAL.width / 2 &&
    point.y >= RUINED_HOSPITAL.y - RUINED_HOSPITAL.height / 2 &&
    point.y <= RUINED_HOSPITAL.y + RUINED_HOSPITAL.height / 2
  );
}

export function shouldHospitalKnightAggro(distanceToPlayer: number, provoked: boolean): boolean {
  return provoked || distanceToPlayer <= HOSPITAL_KNIGHT_AGGRO_RADIUS;
}

export function getHospitalKnightGuardRoamTarget(seed: number): { x: number; y: number } {
  const angle = seed * 2.399963229728653;
  const radius = 82 + (seed % 5) * 26;
  return {
    x: HOSPITAL_KNIGHT_SPAWN.x + Math.cos(angle) * radius,
    y: HOSPITAL_KNIGHT_SPAWN.y + Math.sin(angle) * radius,
  };
}

export function isHospitalKnightDamageable(phase: HospitalKnightPhase, activeBoneSoldiers: number): boolean {
  return phase === 1 || activeBoneSoldiers <= 0;
}

export function shouldConvertZombieToBoneSoldier(holyShroudCasts: number): boolean {
  return holyShroudCasts < HOLY_SHROUD_MAX_CASTS;
}

export function getNextHospitalKnightSkill(phase: HospitalKnightPhase, cursor: number): HospitalKnightSkillId {
  const skills = phase === 2 ? PHASE_TWO_SKILLS : PHASE_ONE_SKILLS;
  return skills[Math.abs(cursor) % skills.length];
}
